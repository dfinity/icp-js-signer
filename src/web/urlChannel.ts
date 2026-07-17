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

/** A request awaiting a signer return, identified by its call order and id. */
interface PendingRequest {
  index: number;
  id: string | number | null;
}

/** The completed calls of a flow, plus the batch awaiting a signer return. */
interface StoredFlow {
  /** Responses of completed calls, keyed by call order. */
  results: Record<number, JsonRpcResponse>;
  /** The requests sent in the current redirect, if the browser is at the signer. */
  pending?: { state: string; requests: PendingRequest[] };
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

const parseJson = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
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
 * Requests issued concurrently — e.g. `Promise.all([signer.delegation(...),
 * signer.accounts(...)])` — arrive before the page navigates. They are
 * coalesced into a single JSON-RPC batch and answered in one round-trip
 * instead of one redirect per request. Sequential requests, where a later one
 * cannot be issued until an earlier `await` resolves, remain one per redirect.
 *
 * The calling code must run on every load and issue the same sequence of
 * requests in the same order (branch only on values recovered from earlier
 * responses), and keep side effects out of that sequence, because it
 * re-executes on each round-trip. See the module README for the full replay
 * contract.
 * @see https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_167_browser_url_transport.md
 */
export class UrlChannel implements Channel {
  readonly #options: UrlChannelOptions;
  readonly #closeListeners = new Set<() => void>();
  readonly #responseListeners = new Set<(response: JsonRpcResponse) => void>();
  #results: Record<number, JsonRpcResponse>;
  #index = 0;
  #closed = false;
  #buffer: { index: number; request: JsonRpcRequest }[] = [];
  #flushHandle?: ReturnType<typeof setTimeout>;
  #navigated = false;

  constructor(options: UrlChannelOptions) {
    this.#options = options;
    const flow = readFlow(options.storage, options.storageKey);
    this.#results = flow.results;

    // If this load is a signer return, fold each response of the returned
    // batch into the results by the index of the call that was awaiting it.
    const params = new URLSearchParams(options.location.hash.slice(1));
    const message = params.get('message');
    const state = params.get('state');
    if (message !== null && flow.pending !== undefined && state === flow.pending.state) {
      const parsed = parseJson(message);
      const responses = Array.isArray(parsed) ? parsed : [parsed];
      for (const { index, id } of flow.pending.requests) {
        const match = responses.find(
          (response): response is JsonRpcResponse =>
            isJsonRpcResponse(response) && response.id === id,
        );
        if (match !== undefined) {
          this.#results = { ...this.#results, [index]: match };
        }
      }
      options.storage.setItem(options.storageKey, JSON.stringify({ results: this.#results }));
      // Strip the fragment so the response doesn't linger in history or the
      // referrer.
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
   * this call, otherwise buffers it for the next redirect. Requests buffered
   * before the redirect fires (issued concurrently) are sent together as one
   * JSON-RPC batch. When the redirect fires the page unloads, so the caller's
   * awaited response never arrives on this load — it arrives on the return
   * load, when the calling code replays this same request and it resolves from
   * storage.
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

    // Buffer the request and flush on the next macrotask, so concurrently
    // issued requests (already queued as microtasks) are all collected first
    // and sent as a single batch.
    this.#buffer.push({ index, request });
    this.#flushHandle ??= setTimeout(() => this.#flush(), 0);
    return Promise.resolve();
  }

  #flush(): void {
    this.#flushHandle = undefined;
    if (this.#closed || this.#navigated || this.#buffer.length === 0) {
      return;
    }
    this.#navigated = true;

    const buffered = this.#buffer;
    this.#buffer = [];
    const state = this.#options.crypto.randomUUID();
    this.#options.storage.setItem(
      this.#options.storageKey,
      JSON.stringify({
        results: this.#results,
        pending: {
          state,
          requests: buffered.map(({ index, request }) => ({ index, id: request.id ?? null })),
        },
      }),
    );

    const requests = buffered.map(({ request }) => request);
    const message = JSON.stringify(requests.length === 1 ? requests[0] : requests);
    const fragment = new URLSearchParams({
      message,
      callback: this.#options.callbackUrl,
      state,
    });
    this.#options.location.assign(`${this.#options.url}#${fragment.toString()}`);
  }

  /** Marks the channel closed and notifies all close listeners. */
  close(): Promise<void> {
    if (this.#closed) {
      return Promise.resolve();
    }
    this.#closed = true;
    if (this.#flushHandle !== undefined) {
      clearTimeout(this.#flushHandle);
      this.#flushHandle = undefined;
    }
    for (const listener of this.#closeListeners) {
      listener();
    }
    return Promise.resolve();
  }
}
