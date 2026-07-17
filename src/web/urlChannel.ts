import type { Channel, JsonRpcRequest, JsonRpcResponse } from '../transport.js';
import type { UrlFlow } from './urlFlow.js';

/**
 * A {@link Channel} implementation for the ICRC-167 browser URL transport,
 * driving a shared {@link UrlFlow} journal.
 *
 * Each request either resolves from the journal (a replayed call on the return
 * load) or is buffered for the next redirect. Concurrently issued requests are
 * coalesced by the flow into a single JSON-RPC batch and one redirect. When the
 * redirect fires the page unloads, so the caller's awaited response never
 * arrives on this load — it arrives on the return load, when the calling code
 * replays this request and it resolves from the journal.
 *
 * The flow detects completion and cleans up automatically once the calls
 * settle, so callers need no explicit resume or cleanup step. This requires the
 * calling code to await nothing but `memoize` and signer requests between calls;
 * see {@link UrlFlow} and the module README for the replay contract.
 * @see https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_167_browser_url_transport.md
 */
export class UrlChannel implements Channel {
  readonly #flow: UrlFlow;
  readonly #closeListeners = new Set<() => void>();
  readonly #responseListeners = new Set<(response: JsonRpcResponse) => void>();
  #closed = false;

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
   * call, otherwise buffers it for the next redirect.
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
      this.#flow.touch();
      return Promise.resolve();
    }

    this.#flow.request(index, request);
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
