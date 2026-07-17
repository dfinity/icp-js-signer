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
 * navigating again. Keeping the counter here — rather than on the channel —
 * means a single unified call order across memoized steps and requests, and
 * survives the signer recreating the channel within a load.
 *
 * The journal is stamped with a creation time; once older than the configured
 * timeout it is treated as absent, so an abandoned flow (and any single-use
 * value it captured) is not resumed later.
 */
export class UrlFlow {
  readonly #options: UrlFlowOptions;
  #results: Record<number, unknown>;
  #index = 0;
  #navigated = false;
  #createdAt?: number;
  readonly #resumable: boolean;

  constructor(options: UrlFlowOptions) {
    this.#options = options;
    const stored = readStored(options.storage, options.storageKey);

    const expired =
      stored.createdAt !== undefined && options.now() - stored.createdAt > options.flowTimeout;
    if (expired) {
      options.storage.removeItem(options.storageKey);
      this.#results = {};
      this.#resumable = false;
      return;
    }

    this.#createdAt = stored.createdAt;
    this.#results = stored.results;
    this.#resumable = Object.keys(stored.results).length > 0 || stored.pending !== undefined;

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

  /** Whether a non-expired flow is in progress and should be resumed. */
  get resumable(): boolean {
    return this.#resumable;
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
   * Records a completed non-navigating result (e.g. a memoized value).
   * @param index - The call-order slot to write.
   * @param value - The value to store; must be JSON-serializable.
   */
  record(index: number, value: unknown): void {
    this.#results[index] = value;
    this.#persist();
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
      return cached as T;
    }
    const value = await produce();
    this.record(index, value);
    return value;
  }

  /** Whether a redirect has already been initiated on this load. */
  get navigated(): boolean {
    return this.#navigated;
  }

  /**
   * Persists the batch as pending and navigates the browser to the signer.
   * @param batch - The buffered requests, each with its reserved call-order slot.
   */
  navigate(batch: { index: number; request: JsonRpcRequest }[]): void {
    if (this.#navigated || batch.length === 0) {
      return;
    }
    this.#navigated = true;

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
