import {
  type Channel,
  type JsonRpcRequest,
  type JsonRpcResponse,
  isJsonRpcResponse,
} from '../transport.js';

/** Options for creating a {@link UrlChannel}. */
export interface UrlChannelOptions {
  /** The signer's ICRC-167 transport URL. */
  url: string;
  /** The relying party callback URL the signer returns the response to. */
  callbackUrl: string;
  /** Storage used to persist flow progress across the redirect. */
  storage: Storage;
  /** Key under which flow state is stored. */
  storageKey: string;
  /** Location used to read the callback and perform the redirect. */
  location: Pick<Location, 'assign' | 'hash' | 'pathname' | 'search'>;
  /** History used to strip the fragment after reading a response. */
  history: Pick<History, 'replaceState'>;
  /** Source of random UUIDs for the `state` parameter. */
  crypto: Pick<Crypto, 'randomUUID'>;
}

/** The completed calls of a flow, plus the one call awaiting a signer return. */
interface StoredFlow {
  /** Responses of completed calls, keyed by call order. */
  results: Record<number, JsonRpcResponse>;
  /** The call currently awaiting a return, if the browser is at the signer. */
  pending?: { index: number; state: string };
}

const readFlow = (storage: Storage, key: string): StoredFlow => {
  const raw = storage.getItem(key);
  if (raw === null) {
    return { results: {} };
  }
  try {
    const parsed = JSON.parse(raw) as StoredFlow;
    return { results: parsed.results ?? {}, pending: parsed.pending };
  } catch {
    return { results: {} };
  }
};

/**
 * A {@link Channel} implementation for the ICRC-167 browser URL transport.
 *
 * Each request is sent by navigating the browser to the signer with the
 * request in the URL hash fragment; the signer returns the response in the
 * fragment of the relying party's `callbackUrl`. A top-level redirect unloads
 * the page, so an in-memory promise cannot survive a round-trip. Instead, this
 * channel keys each call by its order within the flow and persists completed
 * results in {@link Storage}: on the return load the calling code re-runs, and
 * already-completed calls resolve from storage instead of navigating again,
 * so `const x = await a(); const y = await b(x)` replays to where it left off.
 *
 * The calling code must therefore issue the same sequence of requests, in the
 * same order, on every load (branch only on values recovered from earlier
 * responses), and keep side effects out of that sequence — it re-executes on
 * each round-trip. See the module README for the full replay contract.
 * @see https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_167_browser_url_transport.md
 */
export class UrlChannel implements Channel {
  readonly #options: UrlChannelOptions;
  readonly #closeListeners = new Set<() => void>();
  readonly #responseListeners = new Set<(response: JsonRpcResponse) => void>();
  #results: Record<number, JsonRpcResponse>;
  #index = 0;
  #closed = false;
  #navigating = false;

  constructor(options: UrlChannelOptions) {
    this.#options = options;
    const flow = readFlow(options.storage, options.storageKey);
    this.#results = flow.results;

    // If this load is a signer return, fold its response into the results by
    // the index of the call that was awaiting it.
    const params = new URLSearchParams(options.location.hash.slice(1));
    const message = params.get('message');
    const state = params.get('state');
    if (message !== null && flow.pending !== undefined && state === flow.pending.state) {
      const response: unknown = ((): unknown => {
        try {
          return JSON.parse(message);
        } catch {
          return undefined;
        }
      })();
      if (isJsonRpcResponse(response)) {
        this.#results = { ...this.#results, [flow.pending.index]: response };
        options.storage.setItem(options.storageKey, JSON.stringify({ results: this.#results }));
      }
      // Strip the fragment so the response doesn't linger in history or the
      // referrer, whether or not it parsed.
      options.history.replaceState(null, '', options.location.pathname + options.location.search);
    }
  }

  /** Whether this channel has been closed. */
  get closed() {
    return this.#closed;
  }

  addEventListener(
    ...[event, listener]:
      | [event: 'close', listener: () => void]
      | [event: 'response', listener: (response: JsonRpcResponse) => void]
  ): () => void {
    switch (event) {
      case 'close':
        this.#closeListeners.add(listener);
        return () => {
          this.#closeListeners.delete(listener);
        };
      case 'response':
        this.#responseListeners.add(listener);
        return () => {
          this.#responseListeners.delete(listener);
        };
    }
  }

  /**
   * Resolves the request from a stored result if the flow has already reached
   * this call, otherwise persists progress and navigates the browser to the
   * signer. In the latter case the page unloads, so the caller's awaited
   * response never arrives on this load — it arrives on the return load, when
   * the calling code replays this same request and it resolves from storage.
   * @param request - The JSON-RPC request to send.
   */
  send(request: JsonRpcRequest): Promise<void> {
    if (this.#closed) {
      return Promise.reject(new Error('Communication channel is closed'));
    }

    const index = this.#index++;
    const cached = this.#results[index];
    if (cached !== undefined) {
      // Replay: emit the stored response, stamped with the id the caller used
      // for this call (the id when it was first sent may have differed).
      const response = { ...cached, id: request.id ?? null } as JsonRpcResponse;
      queueMicrotask(() => {
        for (const listener of this.#responseListeners) {
          listener(response);
        }
      });
      return Promise.resolve();
    }

    // Only one redirect can happen per load; a concurrent second uncached
    // request is left for the next load rather than clobbering this one.
    if (this.#navigating) {
      return Promise.resolve();
    }
    this.#navigating = true;

    const state = this.#options.crypto.randomUUID();
    this.#options.storage.setItem(
      this.#options.storageKey,
      JSON.stringify({ results: this.#results, pending: { index, state } }),
    );
    const fragment = new URLSearchParams({
      message: JSON.stringify(request),
      callback: this.#options.callbackUrl,
      state,
    });
    this.#options.location.assign(`${this.#options.url}#${fragment.toString()}`);
    return Promise.resolve();
  }

  /** Marks the channel closed and notifies all close listeners. */
  close(): Promise<void> {
    if (this.#closed) {
      return Promise.resolve();
    }
    this.#closed = true;
    for (const listener of this.#closeListeners) {
      listener();
    }
    return Promise.resolve();
  }
}
