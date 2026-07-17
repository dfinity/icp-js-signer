import type { Transport } from '../transport.js';
import { UrlChannel } from './urlChannel.js';
import { UrlFlow } from './urlFlow.js';

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
   * Key under which flow state is persisted. Defaults to a key derived from
   * `callbackUrl`, so each flow (which has its own callback) gets its own
   * journal automatically — set this only to override that namespacing.
   * @default `icrc167:flow:${callbackUrl}`
   */
  storageKey?: string;
  /**
   * Time in milliseconds after which an unfinished flow's persisted state is
   * considered stale and ignored, so an abandoned flow (and any single-use
   * value it captured, such as a nonce) is not resumed later.
   * @default 600000
   */
  flowTimeout?: number;
  /**
   * Clock used to timestamp and expire flow state.
   * @default () => Date.now()
   */
  now?: () => number;
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
 * unloads the page, the transport keeps a call-order-keyed journal in
 * {@link Storage} and replays it on the return load — so calling code written
 * as `const x = await a(); const y = await b(x)` continues where it left off
 * across the redirect.
 *
 * Run the calling code on the load of the flow's route: a fresh arrival and
 * the signer's return both land there, so re-running it starts the flow the
 * first time and replays it on the return. No resume or cleanup call is
 * needed — the flow detects completion once the calls settle and clears its
 * own journal. This requires the calling code to await **nothing but `memoize`
 * and signer requests between calls** (branch only on values recovered from
 * earlier results); a bare `await` between calls is invisible to the completion
 * detection and breaks the replay. See {@link UrlFlow}.
 *
 * The journal is namespaced by `callbackUrl` by default, so a relying party
 * with several flows (each with its own callback) gets an isolated journal per
 * flow without configuring storage keys. An unfinished flow's journal expires
 * after `flowTimeout`, so an abandoned flow is not resumed later.
 * @see https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_167_browser_url_transport.md
 * @example
 * ```ts
 * const transport = new UrlTransport({
 *   url: "https://id.ai/icrc-167",
 *   callbackUrl: "https://relying.example.com/signer-callback",
 * });
 * const signer = new Signer({ transport });
 *
 * // On the load of the callback route (fresh arrival or signer return):
 * const nonce = await transport.memoize(() => fetchAttributeNonce());
 * const [attributes, delegation] = await Promise.all([
 *   signer.requestAttributes({ nonce }),
 *   signer.delegation({ publicKey, targets }),
 * ]);
 * finish(nonce, attributes, delegation); // runs once, on completion
 * ```
 */
export class UrlTransport implements Transport {
  readonly #flow: UrlFlow;

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

    this.#flow = new UrlFlow({
      url: options.url,
      callbackUrl: options.callbackUrl,
      storage: options.storage ?? globalThis.sessionStorage,
      storageKey: options.storageKey ?? `icrc167:flow:${options.callbackUrl}`,
      flowTimeout: options.flowTimeout ?? 600000,
      location: options.location ?? globalThis.location,
      history: options.history ?? globalThis.history,
      crypto: options.crypto ?? globalThis.crypto,
      now: options.now ?? (() => Date.now()),
    });
  }

  /** Establishes a channel that drives this transport's shared flow journal. */
  establishChannel(): Promise<UrlChannel> {
    return Promise.resolve(new UrlChannel(this.#flow));
  }

  /**
   * Runs `produce` once and journals its result in the same call-order record
   * as requests, so an async pre-step — such as fetching a single-use nonce —
   * runs on the first load and replays its result on the return load instead
   * of re-running. This keeps a value that the signer signed against (e.g. a
   * certified-attributes nonce) stable across the redirect.
   *
   * `produce` is awaited if it returns a promise. Its result must be
   * JSON-serializable, and it is subject to the same ordering rule as
   * requests: call `memoize` in a stable order across loads.
   * @param produce - Produces the value to journal on the first load.
   * @returns The produced value, or the journaled value on a replay load.
   */
  memoize<T>(produce: () => T | Promise<T>): Promise<T> {
    return this.#flow.memoize(produce);
  }
}
