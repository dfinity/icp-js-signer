import { type JsonRpcRequest, type JsonRpcResponse, isJsonRpcResponse } from '../transport.js';

/** Options for creating a {@link UrlFlow}. */
export interface UrlFlowOptions {
  /** The signer's ICRC-167 transport URL. */
  url: string;
  /** The relying party callback URL the signer returns the response to. */
  callbackUrl: string;
  /** Storage used to persist flow progress across the redirect. */
  storage: Storage;
  /** Key under which flow state is stored. */
  storageKey: string;
  /**
   * Time in milliseconds after which an unfinished flow's persisted state is
   * considered stale and ignored (a new flow starts instead).
   */
  flowTimeout: number;
  /** Location used to read the callback and perform the redirect. */
  location: Pick<Location, 'assign' | 'hash' | 'pathname' | 'search'>;
  /** History used to strip the fragment after reading a response. */
  history: Pick<History, 'replaceState'>;
  /** Source of random UUIDs for the `state` parameter. */
  crypto: Pick<Crypto, 'randomUUID'>;
  /** Clock used to timestamp flow state and expire it. */
  now: () => number;
}

/** A request awaiting a signer return, identified by its call order and id. */
interface PendingRequest {
  index: number;
  id: string | number | null;
}

/** The persisted journal: results by call order, plus any batch in flight. */
interface StoredFlow {
  createdAt?: number;
  /**
   * The redirect target captured on the first load. A signer return lands on
   * the callback with no query, so an RP that derives its transport `url` from
   * the query (identity provider, discovery/SSO params, …) reconstructs it as a
   * bare default on the return load. Persisting it here lets a second hop in the
   * same flow redirect to the original target rather than that default.
   */
  url?: string;
  results: Record<number, unknown>;
  /**
   * Call-order slots whose producer was asynchronous. `memoize` mirrors its
   * producer's shape, so on a replay load these slots must resolve to a promise
   * even though the journaled value is the already-resolved result — otherwise a
   * promise-returning `memoize` would hand back a bare value on the second run.
   */
  asyncSlots?: number[];
  /**
   * Content fingerprint (method + params) of the request journaled at each
   * call-order slot. Not used to address the journal — call order still does
   * that — but to detect divergence: on a replay load a request whose content
   * no longer matches the one recorded at its slot throws instead of being
   * silently handed another call's response.
   */
  requestKeys?: Record<number, string>;
  pending?: { state: string; requests: PendingRequest[] };
}

const readStored = (storage: Storage, key: string): StoredFlow => {
  const raw = storage.getItem(key);
  if (raw === null) {
    return { results: {} };
  }
  try {
    const parsed = JSON.parse(raw) as StoredFlow;
    return {
      createdAt: parsed.createdAt,
      url: parsed.url,
      results: parsed.results ?? {},
      asyncSlots: parsed.asyncSlots,
      requestKeys: parsed.requestKeys,
      pending: parsed.pending,
    };
  } catch {
    return { results: {} };
  }
};

const parseJson = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

/**
 * The shared journal for one URL-transport flow (one page load).
 *
 * A single call-order-keyed record of results is shared by memoized steps and
 * signer requests, and persisted across the top-level redirect. Concurrently
 * issued requests are coalesced into one JSON-RPC batch and one redirect.
 *
 * A load continues an existing flow only when it is a signer **return** — the
 * URL carries a `message` matching the stored `pending`. In that case the
 * returned responses are folded into the journal and the calling code replays
 * from it (already-completed calls resolve from storage instead of navigating
 * again). Any other load — a bare visit to the callback, a leftover completed
 * journal, or an abandoned `pending` with no `message` — starts a **fresh**
 * flow: the stored journal is ignored and overwritten by the first request. So
 * navigating to the callback always starts the flow, and there is no separate
 * "clear" step — a finished flow's journal is simply inert to the next one.
 * (`flowTimeout` is a backstop for the storage entry.)
 */
export class UrlFlow {
  readonly #options: UrlFlowOptions;
  #results: Record<number, unknown>;
  #index = 0;
  #navigated = false;
  #createdAt?: number;
  // The redirect target used for navigation. Seeded from the constructor url,
  // but on a signer return replaced by the target persisted on the first load,
  // so a second hop reaches the same signer even when the return-load url is a
  // bare default (see StoredFlow.url).
  #url: string;
  // Call-order slots whose producer was async, so a replay returns a promise
  // (see StoredFlow.asyncSlots).
  #asyncSlots: Set<number>;
  // Content fingerprint per request slot, for the replay divergence guard
  // (see StoredFlow.requestKeys).
  #requestKeys: Record<number, string> = {};
  #buffer: { index: number; request: JsonRpcRequest }[] = [];
  #inFlight = 0;
  #flushTimer?: ReturnType<typeof setTimeout>;

  constructor(options: UrlFlowOptions) {
    this.#options = options;
    this.#url = options.url;
    this.#asyncSlots = new Set();
    const stored = readStored(options.storage, options.storageKey);
    const expired =
      stored.createdAt !== undefined && options.now() - stored.createdAt > options.flowTimeout;
    if (expired) {
      options.storage.removeItem(options.storageKey);
    }

    const params = new URLSearchParams(options.location.hash.slice(1));
    const message = params.get('message');
    const state = params.get('state');

    // A response fragment must never linger in history or the referrer — strip
    // it whenever one is present, even when it doesn't match a pending flow
    // (e.g. storage was cleared or the state mismatched), since it may carry a
    // delegation or other sensitive result.
    if (message !== null) {
      options.history.replaceState(null, '', options.location.pathname + options.location.search);
    }

    if (
      !expired &&
      message !== null &&
      stored.pending !== undefined &&
      state === stored.pending.state
    ) {
      // Signer return: keep the completed results and fold in the returned
      // batch by the index of the request awaiting each response.
      this.#createdAt = stored.createdAt;
      // Recover the original redirect target; the return-load url may be a
      // bare default (the query that produced it is gone on the callback).
      this.#url = stored.url ?? options.url;
      this.#results = { ...stored.results };
      this.#asyncSlots = new Set(stored.asyncSlots);
      this.#requestKeys = { ...stored.requestKeys };
      const parsed = parseJson(message);
      const responses = Array.isArray(parsed) ? parsed : [parsed];
      for (const { index, id } of stored.pending.requests) {
        const match = responses.find(
          (response): response is JsonRpcResponse =>
            isJsonRpcResponse(response) && response.id === id,
        );
        if (match !== undefined) {
          this.#results[index] = match;
        }
      }
      this.#persist();
    } else {
      // Not a return: start fresh. Any leftover journal is ignored and
      // overwritten by the first request.
      this.#results = {};
    }
  }

  /** Reserves the next call-order slot. */
  next(): number {
    return this.#index++;
  }

  /**
   * The stored result for a slot, or `undefined` if it has not completed.
   * @param index - The call-order slot to read.
   */
  get(index: number): unknown {
    return this.#results[index];
  }

  /**
   * The content fingerprint recorded for a request slot, or `undefined` if no
   * request was journaled there. Used by the channel's replay divergence guard.
   * @param index - The call-order slot to read.
   */
  recordedRequestKey(index: number): string | undefined {
    return this.#requestKeys[index];
  }

  /**
   * Buffers an uncached request for the next redirect.
   * @param index - The call-order slot reserved for the request.
   * @param request - The JSON-RPC request to send on the next redirect.
   * @param key - Content fingerprint recorded for the divergence guard.
   */
  request(index: number, request: JsonRpcRequest, key: string): void {
    this.#buffer.push({ index, request });
    this.#requestKeys[index] = key;
    this.#scheduleFlush();
  }

  /**
   * The core journaled step: runs `produce` once for its call-order slot and
   * records the result, or returns the recorded result on a replay load
   * without running `produce` again. This is what `UrlTransport.memoize`
   * exposes for any async work other than a signer request (e.g. fetching a
   * single-use nonce), and it shares its call-order counter with requests.
   * @param produce - Produces the value on the first load; awaited if a promise.
   * @returns The produced value, or the journaled value on a replay load.
   */
  memoize<T>(produce: () => Promise<T>): Promise<T>;
  memoize<T>(produce: () => T): T;
  memoize<T>(produce: () => T | Promise<T>): T | Promise<T> {
    const index = this.next();
    const cached = this.get(index);
    if (cached !== undefined) {
      // Replay: mirror the producer's original shape. An async slot resolves to
      // a promise (even though the journaled value is already resolved) so a
      // promise-returning memoize never hands back a bare value on the second
      // run; a sync slot returns the value directly.
      return this.#asyncSlots.has(index) ? Promise.resolve(cached as T) : (cached as T);
    }

    const record = (value: T, isAsync: boolean): T => {
      this.#results[index] = value;
      if (isAsync) {
        this.#asyncSlots.add(index);
      }
      this.#persist();
      return value;
    };
    const release = (): void => {
      this.#inFlight--;
      // A buffered request may have been held off while this producer ran.
      this.#scheduleFlush();
    };

    this.#inFlight++;
    let produced: T | Promise<T>;
    try {
      produced = produce();
    } catch (error) {
      release();
      throw error;
    }
    // Async producer: keep the in-flight count raised until it records, so the
    // batch flush waits for it (a concurrently produced value, e.g. a nonce, is
    // journaled before we navigate). Sync producer: record and release now.
    if (produced instanceof Promise) {
      return produced.then(value => record(value, true)).finally(release);
    }
    try {
      return record(produced, false);
    } finally {
      release();
    }
  }

  #scheduleFlush(): void {
    if (this.#flushTimer !== undefined) {
      clearTimeout(this.#flushTimer);
    }
    // Defer to a macrotask so concurrently issued requests are collected into
    // one batch before navigating.
    this.#flushTimer = setTimeout(() => this.#flush(), 0);
  }

  #flush(): void {
    this.#flushTimer = undefined;
    // Hold the redirect until any in-flight memoize producer has recorded, so a
    // concurrently produced value (e.g. a nonce) is journaled before we leave.
    if (this.#inFlight > 0 || this.#buffer.length === 0) {
      return;
    }
    this.#navigate();
  }

  #navigate(): void {
    if (this.#navigated) {
      return;
    }
    this.#navigated = true;

    const batch = this.#buffer;
    this.#buffer = [];
    const state = this.#options.crypto.randomUUID();
    this.#persist({
      state,
      requests: batch.map(({ index, request }) => ({ index, id: request.id ?? null })),
    });

    const requests = batch.map(({ request }) => request);
    const message = JSON.stringify(requests.length === 1 ? requests[0] : requests);
    const fragment = new URLSearchParams({
      message,
      callback: this.#options.callbackUrl,
      state,
    });
    this.#options.location.assign(`${this.#url}#${fragment.toString()}`);
  }

  #persist(pending?: { state: string; requests: PendingRequest[] }): void {
    this.#createdAt ??= this.#options.now();
    this.#options.storage.setItem(
      this.#options.storageKey,
      JSON.stringify({
        createdAt: this.#createdAt,
        url: this.#url,
        results: this.#results,
        asyncSlots: [...this.#asyncSlots],
        requestKeys: this.#requestKeys,
        pending,
      }),
    );
  }
}
