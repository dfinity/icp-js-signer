import type { Channel, JsonRpcRequest, JsonRpcResponse } from '../transport.js';
import type { UrlFlow } from './urlFlow.js';

// Content fingerprint (method + params) of a request, checked on replay to
// detect a request landing on a call-order slot whose original differs.
const requestKey = (request: JsonRpcRequest): string =>
  JSON.stringify({ method: request.method, params: request.params ?? null });

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
 * Callers need no explicit resume or cleanup step: a signer return continues
 * the flow, and any other load starts a fresh one. Issue the same requests (and
 * `memoize` steps) in the same order on every load, and route any value a
 * request depends on through `memoize` so it stays stable across the redirect;
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

    // A request without an id gets no response, so it could never complete over
    // a redirect — it would re-navigate on every replay. Reject up front rather
    // than loop. (Notifications are inherently unsupported by this transport.)
    if (request.id === undefined || request.id === null) {
      return Promise.reject(
        new Error('The URL transport requires a request id; notifications are not supported'),
      );
    }

    const index = this.#flow.next();
    const key = requestKey(request);
    const cached = this.#flow.get(index);
    if (cached !== undefined) {
      // Call order picks the slot; the fingerprint guards it. A mismatch — or an
      // undefined recorded key (the slot held a `memoize` step) — is a divergence.
      if (this.#flow.recordedRequestKey(index) !== key) {
        return Promise.reject(
          new Error(
            'URL transport replay diverged: the request at this step differs from the one sent before the redirect. Issue the same requests in the same order on every load.',
          ),
        );
      }
      // Re-stamp with this call's id; it may differ from the original send.
      const response = { ...(cached as JsonRpcResponse), id: request.id ?? null };
      queueMicrotask(() => {
        for (const listener of this.#responseListeners) {
          listener(response);
        }
      });
      return Promise.resolve();
    }

    this.#flow.request(index, request, key);
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
