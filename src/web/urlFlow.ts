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
  results: Record<number, unknown>;
  pending?: { state: string; requests: PendingRequest[] };
}

const readStored = (storage: Storage, key: string): StoredFlow => {
  const raw = storage.getItem(key);
  if (raw === null) {
    return { results: {} };
  }
  try {
    const parsed = JSON.parse(raw) as StoredFlow;
    return { createdAt: parsed.createdAt, results: parsed.results ?? {}, pending: parsed.pending };
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
 * signer requests, and persisted across the top-level redirect. On the return
 * load the calling code re-runs; each memoized step and each request that has
 * already completed resolves from this journal instead of running or
 * navigating again, so `const x = await a(); const y = await b(x)` replays to
 * where it left off. Concurrently issued requests are coalesced into one
 * JSON-RPC batch and one redirect.
 *
 * Completion is detected by quiescence: the flow reschedules a settle task on
 * every call, and once the calls have settled it either navigates the batch
 * (if any request missed) or, if nothing navigated, clears the journal (the
 * flow ran to the end). This is only sound when the calling code awaits
 * **nothing but `memoize` and signer requests between calls** — an in-flight
 * `memoize` producer holds settle off (so it can't fire mid-fetch, and so a
 * concurrent memoized value is recorded before any redirect), but a bare
 * `await` the flow makes on its own is invisible here and would let settle
 * fire in the gap. The `flowTimeout` stamp is a backstop: a journal older than
 * the timeout is treated as absent, so an abandoned flow is not resumed later.
 */
export class UrlFlow {
  readonly #options: UrlFlowOptions;
  #results: Record<number, unknown>;
  #index = 0;
  #navigated = false;
  #createdAt?: number;
  #buffer: { index: number; request: JsonRpcRequest }[] = [];
  #inFlight = 0;
  #settleTimer?: ReturnType<typeof setTimeout>;

  constructor(options: UrlFlowOptions) {
    this.#options = options;
    const stored = readStored(options.storage, options.storageKey);

    const expired =
      stored.createdAt !== undefined && options.now() - stored.createdAt > options.flowTimeout;
    if (expired) {
      options.storage.removeItem(options.storageKey);
      this.#results = {};
      return;
    }

    this.#createdAt = stored.createdAt;
    this.#results = stored.results;

    // If this load is a signer return, fold each response of the returned
    // batch into the journal by the index of the request awaiting it.
    const params = new URLSearchParams(options.location.hash.slice(1));
    const message = params.get('message');
    const state = params.get('state');
    if (message !== null && stored.pending !== undefined && state === stored.pending.state) {
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
      // Strip the fragment so the response doesn't linger in history or the referrer.
      options.history.replaceState(null, '', options.location.pathname + options.location.search);
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

  /** Marks flow activity (a replayed call), rescheduling the settle task. */
  touch(): void {
    this.#scheduleSettle();
  }

  /**
   * Buffers an uncached request for the next redirect and marks activity.
   * @param index - The call-order slot reserved for the request.
   * @param request - The JSON-RPC request to send on the next redirect.
   */
  request(index: number, request: JsonRpcRequest): void {
    this.#buffer.push({ index, request });
    this.#scheduleSettle();
  }

  /**
   * The core journaled step: runs `produce` once for its call-order slot and
   * records the result, or returns the recorded result on a replay load
   * without running `produce` again. This is what `UrlTransport.memoize`
   * exposes for async pre-steps (e.g. fetching a single-use nonce), and it
   * shares its call-order counter with requests.
   * @param produce - Produces the value on the first load; awaited if a promise.
   * @returns The produced value, or the journaled value on a replay load.
   */
  async memoize<T>(produce: () => T | Promise<T>): Promise<T> {
    const index = this.next();
    const cached = this.get(index);
    if (cached !== undefined) {
      this.#scheduleSettle();
      return cached as T;
    }
    this.#inFlight++;
    try {
      const value = await produce();
      this.#results[index] = value;
      this.#persist();
      return value;
    } finally {
      this.#inFlight--;
      this.#scheduleSettle();
    }
  }

  #scheduleSettle(): void {
    if (this.#settleTimer !== undefined) {
      clearTimeout(this.#settleTimer);
    }
    this.#settleTimer = setTimeout(() => this.#settle(), 0);
  }

  #settle(): void {
    this.#settleTimer = undefined;
    // A memoize producer is still running; it reschedules settle on resolve.
    if (this.#inFlight > 0) {
      return;
    }
    if (this.#buffer.length > 0) {
      this.#navigate();
      return;
    }
    // No request missed and nothing navigated: the flow ran to completion.
    if (!this.#navigated) {
      this.#options.storage.removeItem(this.#options.storageKey);
    }
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
    this.#options.location.assign(`${this.#options.url}#${fragment.toString()}`);
  }

  #persist(pending?: { state: string; requests: PendingRequest[] }): void {
    this.#createdAt ??= this.#options.now();
    this.#options.storage.setItem(
      this.#options.storageKey,
      JSON.stringify({ createdAt: this.#createdAt, results: this.#results, pending }),
    );
  }
}
