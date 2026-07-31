import type { PublicKey, Signature } from '@icp-sdk/core/agent';
import { Delegation, DelegationChain } from '@icp-sdk/core/identity';
import { Principal } from '@icp-sdk/core/principal';
import type {
  Channel,
  JsonRpcError,
  JsonRpcRequest,
  JsonRpcResponse,
  Transport,
} from './transport.js';

const GENERIC_ERROR = 1000;
const NETWORK_ERROR = 4000;

// Base64 helpers — use native Uint8Array methods when available, fallback to btoa/atob
const toBase64 = (bytes: Uint8Array): string => {
  if ('toBase64' in bytes && typeof bytes.toBase64 === 'function') {
    return bytes.toBase64();
  }
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return globalThis.btoa(binary);
};

const fromBase64 = (str: string): Uint8Array => {
  if ('fromBase64' in Uint8Array && typeof Uint8Array.fromBase64 === 'function') {
    return Uint8Array.fromBase64(str);
  }
  const binary = globalThis.atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

// Helpers to safely read fields from unknown response data
const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const asArray = (value: unknown): unknown[] | undefined =>
  Array.isArray(value) ? value : undefined;

const bytesEqual = (a: Uint8Array, b: Uint8Array): boolean =>
  a.length === b.length && a.every((byte, index) => byte === b[index]);

// Untrusted expiration, decimal-string only: a nanosecond timestamp exceeds
// Number.MAX_SAFE_INTEGER, so a numeric form is already precision-lost by
// JSON.parse. Bound to 20 digits (the width of u64 max) before the super-linear
// decimal→BigInt parse, then reject anything above the u64 range it must fit.
const toExpiration = (value: unknown): bigint => {
  if (typeof value !== 'string' || !/^[0-9]{1,20}$/.test(value)) {
    throw new Error('Invalid delegation expiration');
  }
  const expiration = BigInt(value);
  if (expiration >= 2n ** 64n) {
    throw new Error('Invalid delegation expiration');
  }
  return expiration;
};

// The chain must terminate at exactly the requested session key.
const assertLeafKey = (delegations: DelegationChain['delegations'], publicKey: PublicKey): void => {
  const leaf = delegations[delegations.length - 1]?.delegation.pubkey;
  if (leaf !== undefined && bytesEqual(new Uint8Array(leaf), new Uint8Array(publicKey.toDer()))) {
    return;
  }
  throw new Error('Returned delegation chain does not terminate at the requested public key');
};

// Target scope must be no broader than requested. The chain permits a canister
// iff every hop permits it, so the effective scope is the intersection of the
// scoped hops (an unscoped hop does not constrain); no scoped hop at all means
// the chain is unrestricted — broader than a scoped request.
const assertTargetScope = (
  delegations: DelegationChain['delegations'],
  targets: Principal[] | undefined,
): void => {
  if (targets === undefined) {
    return;
  }
  const requested = new Set(targets.map(target => target.toText()));
  const scopedHops = delegations
    .map(({ delegation }) => delegation.targets)
    .filter((hopTargets): hopTargets is Principal[] => hopTargets !== undefined);
  if (scopedHops.length === 0) {
    throw new Error('Returned delegation is unscoped but scoped targets were requested');
  }
  let effective: Set<string> | undefined;
  for (const hop of scopedHops) {
    const hopSet = new Set(hop.map(target => target.toText()));
    effective =
      effective === undefined
        ? hopSet
        : new Set([...effective].filter(target => hopSet.has(target)));
  }
  for (const target of effective ?? []) {
    if (!requested.has(target)) {
      throw new Error('Returned delegation targets are broader than requested');
    }
  }
};

// Lifetime must be no longer than requested, plus a skew margin for the signer's
// clock and the request round-trip.
const assertLifetime = (
  delegations: DelegationChain['delegations'],
  maxTimeToLive: bigint | undefined,
): void => {
  if (maxTimeToLive === undefined) {
    return;
  }
  const skewNs = 5n * 60n * 1_000_000_000n;
  const maxExpiration = BigInt(Date.now()) * 1_000_000n + maxTimeToLive + skewNs;
  for (const { delegation } of delegations) {
    if (delegation.expiration > maxExpiration) {
      throw new Error('Returned delegation expires later than the requested maxTimeToLive');
    }
  }
};

// Validate a delegation chain returned by the (not fully trusted) signer against
// what was requested. A terminal-key mismatch is fail-closed on-chain (bad
// signatures are rejected), but target-scope and lifetime over-grants are NOT —
// the IC enforces only what the chain contains, with no knowledge of the request
// — so a broader-or-longer delegation than requested would be silently usable.
const validateDelegationChain = (
  chain: DelegationChain,
  params: { publicKey: PublicKey; targets?: Principal[]; maxTimeToLive?: bigint },
): void => {
  assertLeafKey(chain.delegations, params.publicKey);
  assertTargetScope(chain.delegations, params.targets);
  assertLifetime(chain.delegations, params.maxTimeToLive);
};

/**
 * A function that transforms a JSON-RPC request before it is sent to the signer.
 * Transforms are applied in order and each receives the output of the previous one.
 */
export type SignerRequestTransformFn = (request: JsonRpcRequest) => JsonRpcRequest;

/**
 * Ensures a JSON-RPC request contains only valid JSON values by
 * round-tripping through `JSON.stringify` / `JSON.parse`.
 *
 * - Properties with `undefined` values are stripped.
 * - `undefined`, `NaN`, and `Infinity` inside arrays become `null`.
 * - Non-serializable values such as `BigInt` will cause an error.
 * @param request - The JSON-RPC request to clean.
 */
const jsonCleanTransform: SignerRequestTransformFn = request => JSON.parse(JSON.stringify(request));

/**
 * Creates a transform that appends the ICRC-95 derivation origin to request params.
 * @param derivationOrigin - The derivation origin URL to include.
 * @see https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_95_derivationorigin.md
 */
const icrc95DerivationOriginTransform = (derivationOrigin: string): SignerRequestTransformFn => {
  return request => ({
    ...request,
    params: {
      ...request.params,
      icrc95DerivationOrigin: derivationOrigin,
    },
  });
};

/**
 * A permission scope identifies a method and optionally additional
 * constraints (e.g. target canister IDs for delegations).
 * @see https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_25_signer_interaction_standard.md
 */
export type PermissionScope = { method: string } & Record<string, unknown>;

/**
 * The state of a permission scope as reported by the signer.
 * - `granted` — the relying party may call the method without further approval.
 * - `denied` — the signer will reject calls to the method.
 * - `ask_on_use` — the signer will prompt the user when the method is called.
 */
export type PermissionState = 'denied' | 'ask_on_use' | 'granted';

/**
 * A standard supported by the signer, as returned by
 * {@link Signer.getSupportedStandards}. The `name` field contains
 * the ICRC standard identifier (e.g. `"ICRC-27"`) and `url` points
 * to the specification.
 */
export interface SupportedStandard {
  name: string;
  url: string;
}

/**
 * Error thrown when a signer returns a JSON-RPC error response
 * or when a transport-level failure occurs.
 */
export class SignerError extends Error {
  /** The JSON-RPC error code. */
  public code: number;
  /** Optional additional error data from the signer. */
  public data?: JsonRpcError['data'];

  constructor(error: JsonRpcError, options?: ErrorOptions) {
    super(error.message, options);

    this.code = error.code;
    this.data = error.data;
  }
}

/** Options for creating a {@link Signer} instance. */
export interface SignerOptions<T extends Transport> {
  /** The transport used to communicate with the signer. */
  transport: T;
  /**
   * Automatically close the transport channel after a response is received.
   * @default true
   */
  autoCloseTransportChannel?: boolean;
  /**
   * Delay in milliseconds before auto-closing the transport channel.
   * @default 200
   */
  closeTransportChannelAfter?: number;
  /**
   * Source of random UUIDs for JSON-RPC request IDs.
   * @default globalThis.crypto
   */
  crypto?: Pick<Crypto, 'randomUUID'>;
  /**
   * Additional transform functions applied to each outgoing JSON-RPC request,
   * can be used to e.g. add additional params to every request as seen in ICRC-95.
   * Transforms are applied in order; each receives the output of the previous one.
   */
  transforms?: SignerRequestTransformFn[];
  /**
   * Derivation origin for ICRC-95 identity derivation.
   * When set, all requests include an `icrc95DerivationOrigin` param.
   * @see https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_95_derivationorigin.md
   */
  derivationOrigin?: string;
}

/**
 * Client for interacting with an ICRC-25 compliant signer.
 *
 * Signers are applications that hold private keys and can sign messages
 * on behalf of a user. They communicate over a {@link Transport} using
 * JSON-RPC 2.0 messages as defined by the ICRC-25 standard.
 * @see https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_25_signer_interaction_standard.md
 * @example
 * ```ts
 * import { Signer } from "@icp-sdk/signer";
 * import { PostMessageTransport } from "@icp-sdk/signer/web";
 *
 * const transport = new PostMessageTransport({ url: "https://oisy.com/sign" });
 * const signer = new Signer({ transport });
 *
 * const standards = await signer.getSupportedStandards();
 * const accounts = await signer.getAccounts();
 * ```
 */
export class Signer<T extends Transport = Transport> {
  readonly #options: Required<Omit<SignerOptions<T>, 'derivationOrigin'>> &
    Pick<SignerOptions<T>, 'derivationOrigin'>;
  #channel?: Channel;
  #establishingChannel?: Promise<void>;
  #scheduledChannelClosure?: ReturnType<typeof setTimeout>;
  #pendingRequestCount = 0;

  constructor(options: SignerOptions<T>) {
    const transforms: SignerRequestTransformFn[] = [...(options.transforms ?? [])];
    if (options.derivationOrigin) {
      transforms.push(icrc95DerivationOriginTransform(options.derivationOrigin));
    }
    transforms.push(jsonCleanTransform);

    this.#options = {
      autoCloseTransportChannel: true,
      closeTransportChannelAfter: 200,
      crypto: globalThis.crypto,
      ...options,
      transforms,
    };
  }

  /** The transport used to communicate with the signer. */
  get transport(): T {
    return this.#options.transport;
  }

  /**
   * Whether the transport channel auto-closes after a response is received.
   * Can be toggled at runtime, which is useful for multi-step flows that
   * need to await async work between requests without losing the channel.
   * Setting this to `false` also cancels any auto-close already scheduled
   * by a prior response.
   */
  get autoCloseTransportChannel(): boolean {
    return this.#options.autoCloseTransportChannel;
  }

  set autoCloseTransportChannel(value: boolean) {
    this.#options.autoCloseTransportChannel = value;
    if (!value) {
      clearTimeout(this.#scheduledChannelClosure);
    }
  }

  /**
   * Opens a communication channel with the signer.
   * Reuses an existing open channel if available.
   */
  async openChannel(): Promise<Channel> {
    clearTimeout(this.#scheduledChannelClosure);

    if (this.#establishingChannel) {
      await this.#establishingChannel;
    }

    if (this.#channel && !this.#channel.closed) {
      return this.#channel;
    }

    const channel = this.#options.transport.establishChannel();
    this.#establishingChannel = channel.then(() => {}).catch(() => {});
    this.#channel = undefined;
    this.#channel = await channel.catch(error => {
      throw new SignerError(
        {
          code: NETWORK_ERROR,
          message: error instanceof Error ? error.message : 'Network error',
        },
        { cause: error },
      );
    });
    this.#establishingChannel = undefined;
    return this.#channel;
  }

  /** Closes the current communication channel, if open. */
  async closeChannel(): Promise<void> {
    await this.#channel?.close();
  }

  /**
   * Sends a JSON-RPC request over the transport channel.
   * @param request - The JSON-RPC request to send.
   */
  async sendRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const channel = await this.openChannel();

    const { promise, resolve, reject } = Promise.withResolvers<JsonRpcResponse>();

    // Notifications (no `id`) are send-and-forget per JSON-RPC and never
    // produce a response, so they don't keep the channel busy and aren't
    // tracked here. The promise still settles via the close-listener path
    // when the channel eventually closes.
    const expectsResponse = request.id !== undefined && request.id !== null;
    if (expectsResponse) {
      this.#pendingRequestCount++;
    }
    let settled = false;
    const settle = () => {
      if (settled) {
        return;
      }
      settled = true;
      if (expectsResponse) {
        this.#pendingRequestCount--;
      }
    };

    const removeResponseListener = channel.addEventListener('response', response => {
      if (response.id !== request.id) {
        return;
      }

      removeResponseListener();
      removeCloseListener();
      settle();

      // Validate that error responses have the expected shape,
      // normalize invalid ones so #rpc can trust the types
      if (
        'error' in response &&
        (typeof response.error !== 'object' ||
          response.error === null ||
          typeof response.error.code !== 'number' ||
          typeof response.error.message !== 'string')
      ) {
        resolve({
          jsonrpc: '2.0',
          id: response.id,
          error: { code: GENERIC_ERROR, message: 'Invalid error response from signer' },
        });
      } else {
        resolve(response);
      }

      // Only schedule the channel close once every concurrent request has
      // resolved. Without this, a `Promise.all([signIn, requestAttributes])`
      // would lose the channel mid-flight: the first response would schedule
      // the close, and the timer would fire before the second response (or
      // before the user could interact with a consent prompt the second
      // request requires).
      if (this.#options.autoCloseTransportChannel && this.#pendingRequestCount === 0) {
        this.#scheduledChannelClosure = setTimeout(() => {
          if (!channel.closed) {
            channel.close();
          }
        }, this.#options.closeTransportChannelAfter);
      }
    });

    const removeCloseListener = channel.addEventListener('close', () => {
      removeResponseListener();
      removeCloseListener();
      settle();
      reject(
        new SignerError({
          code: NETWORK_ERROR,
          message: 'Channel was closed before a response was received',
        }),
      );
    });

    let transformedRequest: JsonRpcRequest;
    try {
      transformedRequest = this.#applyTransforms(request);
    } catch (cause) {
      removeResponseListener();
      removeCloseListener();
      settle();
      reject(
        new SignerError(
          {
            code: GENERIC_ERROR,
            message: `Transform failed: ${cause instanceof Error ? cause.message : cause}`,
          },
          { cause },
        ),
      );
      return promise;
    }

    try {
      await channel.send(transformedRequest);
    } catch (error) {
      removeResponseListener();
      removeCloseListener();
      settle();
      reject(
        new SignerError(
          {
            code: NETWORK_ERROR,
            message: error instanceof Error ? error.message : 'Network error',
          },
          { cause: error },
        ),
      );
    }

    return promise;
  }

  /**
   * Queries which ICRC standards the signer supports.
   * Use this to determine signer capabilities before calling other methods.
   * @see https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_25_signer_interaction_standard.md
   */
  getSupportedStandards(): Promise<SupportedStandard[]> {
    return this.#rpc({
      method: 'icrc25_supported_standards',
      decode: result => {
        const r = asRecord(result);
        const standards = asArray(r?.supportedStandards);
        if (!standards) {
          throw new Error('Expected supportedStandards array');
        }
        return standards.map(item => {
          const obj = asRecord(item);
          const name = asString(obj?.name);
          const url = asString(obj?.url);
          if (name === undefined || url === undefined) {
            throw new Error('Expected { name, url }');
          }
          return { name, url };
        });
      },
    });
  }

  /**
   * Requests the signer to grant permission for the given scopes.
   * The signer may prompt the user for approval.
   * @param scopes - The permission scopes to request.
   * @returns The current state of each requested scope after the user's decision.
   */
  requestPermissions(
    scopes: PermissionScope[],
  ): Promise<Array<{ scope: PermissionScope; state: PermissionState }>> {
    return this.#rpc({
      method: 'icrc25_request_permissions',
      params: scopes,
      encode: scopes => ({ scopes }),
      decode: result => {
        const r = asRecord(result);
        const scopes = asArray(r?.scopes);
        if (!scopes) {
          throw new Error('Expected scopes array');
        }
        return scopes.map(item => {
          const obj = asRecord(item);
          const scope = asRecord(obj?.scope);
          const state = asString(obj?.state);
          if (!scope || typeof scope.method !== 'string' || !state) {
            throw new Error('Expected { scope: { method }, state }');
          }
          return { scope: scope as PermissionScope, state: state as PermissionState };
        });
      },
    });
  }

  /**
   * Queries the current state of all permission scopes.
   * @returns The current permission state for each scope the signer supports.
   */
  getPermissions(): Promise<Array<{ scope: PermissionScope; state: PermissionState }>> {
    return this.#rpc({
      method: 'icrc25_permissions',
      decode: result => {
        const r = asRecord(result);
        const scopes = asArray(r?.scopes);
        if (!scopes) {
          throw new Error('Expected scopes array');
        }
        return scopes.map(item => {
          const obj = asRecord(item);
          const scope = asRecord(obj?.scope);
          const state = asString(obj?.state);
          if (!scope || typeof scope.method !== 'string' || !state) {
            throw new Error('Expected { scope: { method }, state }');
          }
          return { scope: scope as PermissionScope, state: state as PermissionState };
        });
      },
    });
  }

  /**
   * Requests the accounts managed by the signer.
   * Each account has an owner {@link Principal} and an optional 32-byte subaccount.
   *
   * Requires the `icrc27_accounts` permission scope.
   * @see https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_27_accounts.md
   */
  getAccounts(): Promise<Array<{ owner: Principal; subaccount?: Uint8Array }>> {
    return this.#rpc({
      method: 'icrc27_accounts',
      decode: result => {
        const r = asRecord(result);
        const accounts = asArray(r?.accounts);
        if (!accounts) {
          throw new Error('Expected accounts array');
        }
        return accounts.map(item => {
          const obj = asRecord(item);
          const owner = asString(obj?.owner);
          const subaccount = asString(obj?.subaccount);
          if (!owner) {
            throw new Error('Expected account.owner string');
          }
          return {
            owner: Principal.fromText(owner),
            subaccount: subaccount !== undefined ? fromBase64(subaccount) : undefined,
          };
        });
      },
    });
  }

  /**
   * Requests a delegation chain from the signer for session-based authentication.
   * This allows the relying party to sign canister calls without requiring
   * user approval for each individual call.
   * @param params - The delegation request parameters.
   * @param params.publicKey - The session's public key to delegate to.
   * @param params.targets - Optional canister IDs to restrict the delegation to.
   *   When provided, the signer creates an account delegation; otherwise a
   *   relying party delegation.
   * @param params.maxTimeToLive - Optional maximum delegation lifetime in nanoseconds.
   * @returns A {@link DelegationChain} that can be used with `DelegationIdentity`.
   * @see https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_34_delegation.md
   */
  requestDelegation(params: {
    publicKey: PublicKey;
    targets?: Principal[];
    maxTimeToLive?: bigint;
  }): Promise<DelegationChain> {
    return this.#rpc({
      method: 'icrc34_delegation',
      params,
      encode: v => ({
        publicKey: toBase64(new Uint8Array(v.publicKey.toDer())),
        targets: v.targets?.map(t => t.toText()),
        maxTimeToLive: v.maxTimeToLive !== undefined ? String(v.maxTimeToLive) : undefined,
      }),
      decode: result => {
        const r = asRecord(result);
        const publicKey = asString(r?.publicKey);
        const signerDelegation = asArray(r?.signerDelegation);
        if (!publicKey || !signerDelegation) {
          throw new Error('Expected { publicKey, signerDelegation }');
        }
        const chain = DelegationChain.fromDelegations(
          signerDelegation.map(item => {
            const obj = asRecord(item);
            const del = asRecord(obj?.delegation);
            const pubkey = asString(del?.pubkey);
            const expiration = del?.expiration;
            const signature = asString(obj?.signature);
            if (!pubkey || expiration === undefined || !signature) {
              throw new Error('Expected delegation { pubkey, expiration, signature }');
            }
            const targets = asArray(del?.targets);
            return {
              delegation: new Delegation(
                fromBase64(pubkey),
                toExpiration(expiration),
                targets?.map(t => Principal.fromText(t as string)),
              ),
              signature: fromBase64(signature) as Signature,
            };
          }),
          fromBase64(publicKey),
        );
        // Bind the returned chain to what was requested (session key, target
        // scope, lifetime) so the signer can't hand back a broader or
        // longer-lived delegation than the relying party asked for.
        validateDelegationChain(chain, params);
        return chain;
      },
    });
  }

  /**
   * Requests the signer to execute a canister call on behalf of the user.
   * The signer will prompt the user for approval before signing and
   * submitting the call to the Internet Computer.
   * @param params - The canister call parameters.
   * @param params.canisterId - The target canister.
   * @param params.sender - The principal executing the call.
   * @param params.method - The canister method to invoke.
   * @param params.arg - The Candid-encoded call arguments.
   * @param params.nonce - Optional nonce (max 32 bytes) for replay protection.
   * @returns The CBOR-encoded content map and certificate from the IC,
   *   which can be used to verify the call's execution.
   * @see https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_49_call_canister.md
   */
  callCanister(params: {
    canisterId: Principal;
    sender: Principal;
    method: string;
    arg: Uint8Array;
    nonce?: Uint8Array;
  }): Promise<{ contentMap: Uint8Array; certificate: Uint8Array }> {
    return this.#rpc({
      method: 'icrc49_call_canister',
      params,
      encode: v => ({
        canisterId: v.canisterId.toText(),
        sender: v.sender.toText(),
        method: v.method,
        arg: toBase64(v.arg),
        nonce: v.nonce !== undefined ? toBase64(v.nonce) : undefined,
      }),
      decode: result => {
        const r = asRecord(result);
        const contentMap = asString(r?.contentMap);
        const certificate = asString(r?.certificate);
        if (!contentMap || !certificate) {
          throw new Error('Expected { contentMap, certificate }');
        }
        return { contentMap: fromBase64(contentMap), certificate: fromBase64(certificate) };
      },
    });
  }

  /**
   * Sends a JSON-RPC request to the signer and decodes the result.
   * Handles encoding params, validating the response, and throwing
   * {@link SignerError} on JSON-RPC errors or invalid results.
   * @param args - The RPC call configuration.
   */
  async #rpc<T, P = never>(
    args: { method: string; decode: (result: unknown) => T } & (
      | { params: P; encode: (params: P) => JsonRpcRequest['params'] }
      | { params?: never; encode?: never }
    ),
  ): Promise<T> {
    let params: JsonRpcRequest['params'];
    if (args.encode) {
      try {
        params = args.encode(args.params);
      } catch (cause) {
        throw new SignerError(
          {
            code: GENERIC_ERROR,
            message: `Failed to encode params: ${cause instanceof Error ? cause.message : cause}`,
          },
          { cause },
        );
      }
    }
    const response = await this.sendRequest({
      id: this.#options.crypto.randomUUID(),
      jsonrpc: '2.0',
      method: args.method,
      params,
    });
    if ('error' in response) {
      throw new SignerError(response.error);
    }
    if ('result' in response) {
      try {
        return args.decode(response.result);
      } catch (cause) {
        throw new SignerError(
          {
            code: GENERIC_ERROR,
            message: `Invalid result from signer: ${cause instanceof Error ? cause.message : cause}`,
          },
          { cause },
        );
      }
    }
    throw new SignerError({
      code: GENERIC_ERROR,
      message: 'Response contains neither result nor error',
    });
  }

  /**
   * Applies all configured transforms to a JSON-RPC request.
   * @param request - The JSON-RPC request to transform.
   */
  #applyTransforms(request: JsonRpcRequest): JsonRpcRequest {
    return this.#options.transforms.reduce((req, transform) => transform(req), request);
  }
}
