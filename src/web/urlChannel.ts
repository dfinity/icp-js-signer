import type { Channel, JsonRpcRequest, JsonRpcResponse } from '../transport.js';
import type { UrlFlow } from './urlFlow.js';

/**
 * A {@link Channel} implementation for the ICRC-167 browser URL transport,
 * driving a shared {@link UrlFlow} journal.
 *
 * Each request is sent by navigating the browser to the signer with the
 * request in the URL hash fragment; the signer returns the response in the
 * fragment of the relying party's callback URL. A top-level redirect unloads
 * the page, so an in-memory promise cannot survive a round-trip. Instead, the
 * flow keys each call by its order and persists completed results: on the
 * return load the calling code re-runs, and already-completed calls resolve
 * from storage instead of navigating again, so `const x = await a(); const y =
 * await b(x)` replays to where it left off.
 *
 * Requests issued concurrently — e.g. `Promise.all([signer.delegation(...),
 * signer.accounts(...)])` — arrive before the page navigates. They are
 * coalesced into a single JSON-RPC batch and answered in one round-trip
 * instead of one redirect per request. Sequential requests, where a later one
 * cannot be issued until an earlier `await` resolves, remain one per redirect.
 *
 * The calling code must run on every load and issue the same sequence of
 * requests (and memoized steps) in the same order — branch only on values
 * recovered from earlier responses — and keep side effects out of that
 * sequence, because it re-executes on each round-trip. See the module README.
 * @see https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_167_browser_url_transport.md
 */
export class UrlChannel implements Channel {
  readonly #flow: UrlFlow;
  readonly #closeListeners = new Set<() => void>();
  readonly #responseListeners = new Set<(response: JsonRpcResponse) => void>();
  #closed = false;
  #buffer: { index: number; request: JsonRpcRequest }[] = [];
  #flushHandle?: ReturnType<typeof setTimeout>;

  constructor(flow: UrlFlow) {
    this.#flow = flow;
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
   * Resolves the request from the journal if the flow has already reached this
   * call, otherwise buffers it for the next redirect. Requests buffered before
   * the redirect fires (issued concurrently) are sent together as one JSON-RPC
   * batch. When the redirect fires the page unloads, so the caller's awaited
   * response never arrives on this load — it arrives on the return load, when
   * the calling code replays this request and it resolves from the journal.
   * @param request - The JSON-RPC request to send.
   */
  send(request: JsonRpcRequest): Promise<void> {
    if (this.#closed) {
      return Promise.reject(new Error('Communication channel is closed'));
    }

    const index = this.#flow.next();
    const cached = this.#flow.get(index);
    if (cached !== undefined) {
      // Replay: emit the stored response, stamped with the id the caller used
      // for this call (the id when it was first sent may have differed).
      const response = { ...(cached as JsonRpcResponse), id: request.id ?? null };
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
    if (this.#closed || this.#buffer.length === 0) {
      return;
    }
    const batch = this.#buffer;
    this.#buffer = [];
    this.#flow.navigate(batch);
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
