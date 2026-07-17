import type { Transport } from '../transport.js';
import { UrlChannel } from './urlChannel.js';

/** Error thrown by {@link UrlTransport} for transport-level failures. */
export class UrlTransportError extends Error {}

/** Options for creating a {@link UrlTransport}. */
export interface UrlTransportOptions {
  /** The signer's ICRC-167 transport URL. Must be a secure context (HTTPS, localhost, or 127.0.0.1). */
  url: string;
  /**
   * The relying party callback URL the signer returns the response to. Must be
   * an absolute URL, on an origin the relying party controls, declared in that
   * origin's `/.well-known/ii-auth-callbacks` allow-list, and must not contain
   * a fragment (the transport appends its own).
   */
  callbackUrl: string;
  /**
   * Storage used to persist flow progress across the top-level redirect.
   * Use `sessionStorage` so the flow does not outlive the browsing session.
   * @default globalThis.sessionStorage
   */
  storage?: Storage;
  /**
   * Key under which flow state is persisted.
   * @default "icrc167:flow"
   */
  storageKey?: string;
  /**
   * Location used to read the callback and perform the redirect.
   * @default globalThis.location
   */
  location?: Pick<Location, 'assign' | 'hash' | 'pathname' | 'search'>;
  /**
   * History used to strip the fragment after reading a response.
   * @default globalThis.history
   */
  history?: Pick<History, 'replaceState'>;
  /**
   * Source of random UUIDs for the `state` parameter.
   * @default globalThis.crypto
   */
  crypto?: Pick<Crypto, 'randomUUID'>;
}

const isSecureContextUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' ||
      url.hostname === '127.0.0.1' ||
      url.hostname.split('.').slice(-1)[0] === 'localhost'
    );
  } catch {
    return false;
  }
};

/**
 * ICRC-167 browser URL transport for communicating with web-based signers via
 * top-level navigation.
 *
 * Unlike `PostMessageTransport`, this transport does not keep a live
 * `postMessage` channel. Each request navigates the current window to the
 * signer with the request in the URL hash fragment; the signer returns the
 * response in the fragment of `callbackUrl`. Because a top-level redirect
 * unloads the page, the transport persists completed results (keyed by call
 * order) in {@link Storage} and replays them on the return load — so calling
 * code written as `const x = await a(); const y = await b(x)` continues where
 * it left off across the redirect.
 *
 * The calling code must run on every load and issue the same sequence of
 * requests in the same order (branch only on values recovered from earlier
 * responses), and keep side effects out of that sequence, because it
 * re-executes on each round-trip. Use `hasPendingFlow` to decide whether to
 * resume on load, and `clearFlow` once the flow has fully completed.
 * @see https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_167_browser_url_transport.md
 * @example
 * ```ts
 * const transport = new UrlTransport({
 *   url: "https://id.ai/icrc-167",
 *   callbackUrl: "https://relying.example.com/signer-callback",
 * });
 * const signer = new Signer({ transport });
 *
 * const connect = async () => {
 *   const accounts = await signer.accounts();          // call #0 → redirect
 *   const delegation = await signer.delegation({        // call #1 → redirect
 *     publicKey,
 *     targets,
 *   });
 *   transport.clearFlow();
 *   finish(accounts, delegation);
 * };
 *
 * if (transport.hasPendingFlow()) void connect();       // resume on load
 * connectButton.onclick = () => void connect();         // start
 * ```
 */
export class UrlTransport implements Transport {
  readonly #options: Required<UrlTransportOptions>;

  constructor(options: UrlTransportOptions) {
    if (!isSecureContextUrl(options.url)) {
      throw new UrlTransportError('Invalid signer RPC url');
    }
    let callback: URL;
    try {
      callback = new URL(options.callbackUrl);
    } catch {
      throw new UrlTransportError('Invalid callback url');
    }
    if (callback.hash !== '') {
      throw new UrlTransportError('Callback url must not contain a fragment');
    }

    this.#options = {
      storage: globalThis.sessionStorage,
      storageKey: 'icrc167:flow',
      location: globalThis.location,
      history: globalThis.history,
      crypto: globalThis.crypto,
      ...options,
    };
  }

  /** Establishes a channel that resumes any in-progress flow from storage. */
  establishChannel(): Promise<UrlChannel> {
    return Promise.resolve(new UrlChannel(this.#options));
  }

  /**
   * Whether a flow is in progress and should be resumed on this load. Call it
   * on page load to decide whether to re-run the calling code that drives the
   * flow.
   */
  hasPendingFlow(): boolean {
    return this.#options.storage.getItem(this.#options.storageKey) !== null;
  }

  /** Clears persisted flow state. Call once a flow has fully completed. */
  clearFlow(): void {
    this.#options.storage.removeItem(this.#options.storageKey);
  }
}
