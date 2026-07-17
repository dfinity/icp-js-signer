/** A signer-initiated interaction read from an ICRC-167 callback navigation. */
export interface SignerInitiation {
  /**
   * The interaction the signer suggests the relying party start, such as a
   * JSON-RPC method name (e.g. `"icrc34_delegation"`). May be an empty string
   * when the signer has no specific suggestion.
   */
  hint: string;
  /**
   * Origin of the initiating signer, if the signer provided one. This is only
   * a hint: the relying party must select among signers it already knows and
   * must never navigate to a signer solely because an `init` navigation named
   * it. `null` when no hint was provided.
   */
  signer: string | null;
}

/** Options for {@link readSignerInitiation}. */
export interface ReadSignerInitiationOptions {
  /**
   * Location to read the initiation from.
   * @default globalThis.location
   */
  location?: Pick<Location, 'hash' | 'pathname' | 'search'>;
  /**
   * History used to strip the fragment once the initiation is read.
   * @default globalThis.history
   */
  history?: Pick<History, 'replaceState'>;
}

/**
 * Reads an ICRC-167 signer-initiated interaction from the current URL, if the
 * load is one, and strips the fragment so it is read only once.
 *
 * Call it on page load before starting a flow. When it returns an initiation,
 * begin an ordinary relying-party-initiated flow (optionally preselecting the
 * known signer named by {@link SignerInitiation.signer}); when it returns
 * `undefined`, this is an ordinary load or a relying-party-initiated return.
 * @param options - Environment overrides, mainly for testing.
 * @returns The initiation, or `undefined` when the load is not signer-initiated.
 * @see https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_167_browser_url_transport.md
 */
export const readSignerInitiation = (
  options: ReadSignerInitiationOptions = {},
): SignerInitiation | undefined => {
  const location = options.location ?? globalThis.location;
  const history = options.history ?? globalThis.history;

  const params = new URLSearchParams(location.hash.slice(1));
  const hint = params.get('init');
  if (hint === null) {
    return undefined;
  }

  history.replaceState(null, '', location.pathname + location.search);
  return { hint, signer: params.get('signer') };
};
