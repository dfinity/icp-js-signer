# @icp-sdk/signer

Library to interact with [ICRC-25](https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_25_signer_interaction_standard.md) compliant signers on the Internet Computer.

## What are signers?

A signer is an application that holds private keys and can sign messages on behalf of a user. Each signer chooses which standards to implement, but they typically fall into two categories:

- **Asset wallets** support accounts and canister calls — users approve transactions directly through the signer (e.g. [OISY](https://oisy.com), [Plug](https://plugwallet.ooo), [PrimeVault](https://primevault.com)).
- **Authentication providers** support delegations — users grant a session key that can sign on their behalf for a limited time (e.g. [Internet Identity](https://id.ai)).

Some signers support both (e.g. [NFID](https://nfid.one)). This library provides a unified interface to interact with all of them.

## Installation

```shell
npm install @icp-sdk/signer
```

## Import Paths

- `@icp-sdk/signer` — `Signer` for standardized signer interaction
- `@icp-sdk/signer/agent` — `SignerAgent` as a drop-in replacement for `HttpAgent`
- `@icp-sdk/signer/web` — `PostMessageTransport` and `UrlTransport` for web-based signers
- `@icp-sdk/signer/extension` — `BrowserExtensionTransport` for browser extension signers

## Connecting to a Signer

Two transport types are supported. Web-based signers (like OISY, NFID, Internet Identity) use a window opened to the signer's URL. Browser extensions (like Plug, PrimeVault) are discovered automatically.

### Web

The [ICRC-29](https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_29_window_post_message_transport.md) post message transport communicates with signers that run as web applications. A window is opened to the signer's URL, and messages are exchanged via `postMessage`.

```ts
import { Signer } from '@icp-sdk/signer';
import { PostMessageTransport } from '@icp-sdk/signer/web';

const transport = new PostMessageTransport({ url: SIGNER_URL });
const signer = new Signer({ transport });
```

### URL (redirect)

The [ICRC-167](https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_167_browser_url_transport.md) URL transport communicates with a signer through top-level browser navigation instead of a `postMessage` window. Each request navigates the current page to the signer with the request in the URL hash fragment; the signer returns the response in the fragment of the relying party's `callbackUrl`. This suits flows where a popup is unavailable, such as full-page redirects to the signer.

The `callbackUrl` must be an absolute URL on an origin you control and be declared in that origin's `/.well-known/ii-auth-callbacks` allow-list.

A relying party typically has several flows (connect, sign, request attributes, …). Give each one its own **route** and its own `callbackUrl` pointing at that route: a fresh start and the signer's return both land there, so the route's load is where the flow runs. Each callback also namespaces that flow's persisted journal automatically, so no storage keys need configuring. An unfinished flow's journal expires after `flowTimeout` (default 10 minutes), so an abandoned flow — and any single-use value it captured — is not resumed later.

Because a top-level redirect unloads the page, the transport persists completed request results (keyed by call order) and replays them on the return load. Run your flow code on the route's load: the first visit starts it, and the signer's return replays it to where it left off. There is no resume or cleanup call — the transport detects completion once the calls settle and clears its own journal. This requires the flow to `await` **nothing but `memoize` and signer requests between calls** (branch only on values recovered from earlier responses); a bare `await` between calls is invisible to the completion detection and breaks the replay.

```ts
import { Signer } from '@icp-sdk/signer';
import { UrlTransport } from '@icp-sdk/signer/web';

const transport = new UrlTransport({
  url: SIGNER_URL,
  callbackUrl: 'https://relying.example.com/connect', // this flow's route
});
const signer = new Signer({ transport });

// Runs on the /connect route's load — fresh visit or signer return:
const accounts = await signer.accounts(); // redirect; replays on return
const delegation = await signer.delegation({ publicKey, targets }); // redirect; replays on return
finish(accounts, delegation); // runs once, on completion
```

To start such a flow from elsewhere, navigate the browser to its route (a link) — no method call.

Requests issued concurrently are coalesced into a single JSON-RPC batch and answered in one round-trip. For example, requesting certified attributes together with a delegation via `Promise.all([signer.delegation(...), signer.accounts(...)])` performs one redirect, not two. Sequential requests — where a later one depends on an earlier response — remain one redirect each.

An async pre-step whose result must stay stable across the redirect — such as fetching a single-use nonce that the signer signs against — must be journaled too, so it runs once and replays afterward rather than being re-fetched on the return load. Use `transport.memoize(callback)`: it runs the callback once (awaiting a promise), records the result in the same call-order journal as requests, and replays it on the return load. It is also the only place a flow may `await` non-request async.

```ts
// On the flow's route:
const nonce = await transport.memoize(() => fetchAttributeNonce()); // fetched once, replayed after
const [attributes, delegation] = await Promise.all([
  // one batched redirect
  signer.requestAttributes({ nonce }),
  signer.delegation({ publicKey, targets }),
]);
finish(nonce, attributes, delegation); // runs once, on completion
```

A signer can also start a flow (ICRC-167 signer-initiated interaction). Read it on load with `readSignerInitiation`, then run an ordinary flow — validating the optional `signer` hint against signers you already trust:

```ts
import { readSignerInitiation } from '@icp-sdk/signer/web';

const initiation = readSignerInitiation();
if (initiation) {
  // initiation.hint e.g. "icrc34_delegation"; initiation.signer is only a hint —
  // validate it against signers you know, then run the flow (the signer calls above).
  const delegation = await signer.delegation({ publicKey, targets });
  finish(delegation);
}
```

### Extension

The [ICRC-94](https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_94_multi_injected_provider_discovery.md) transport communicates with signers installed as browser extensions. Extensions announce themselves and are discovered automatically.

```ts
import { Signer } from '@icp-sdk/signer';
import { BrowserExtensionTransport } from '@icp-sdk/signer/extension';

// Discover all installed extension signers
const providerDetails = await BrowserExtensionTransport.discover();

// Let the user choose, then create a transport
const transport = new BrowserExtensionTransport({
  providerDetail: providerDetails[0],
});
const signer = new Signer({ transport });
```

Or connect directly by UUID if you know which extension to use:

```ts
const transport = await BrowserExtensionTransport.findTransport({
  uuid: EXTENSION_UUID,
});
```

## Checking Capabilities

Signers vary in what they support. Query the supported standards before making calls so you can handle unsupported features gracefully:

```ts
const standards = await signer.getSupportedStandards();

// signer.getAccounts() requires ICRC-27
const canGetAccounts = standards.some(s => s.name === 'ICRC-27');

// signer.callCanister() requires ICRC-49
const canCallCanisters = standards.some(s => s.name === 'ICRC-49');

// signer.requestDelegation() requires ICRC-34
const canDelegate = standards.some(s => s.name === 'ICRC-34');

// Asset wallets need both accounts and canister calls
const isAssetWallet = canGetAccounts && canCallCanisters;

// The returned standards also include token standards (e.g. ICRC-1 for
// fungible tokens, ICRC-7 for NFTs), so you can check whether the
// signer can manage a particular asset type.
const supportsFungibleTokens = standards.some(s => s.name === 'ICRC-1');
```

## Transactions

Asset wallets allow users to approve transactions. Use `SignerAgent` as a drop-in replacement for `HttpAgent` — it routes canister calls through the signer for user approval.

```ts
import { Signer } from '@icp-sdk/signer';
import { PostMessageTransport } from '@icp-sdk/signer/web';
import { SignerAgent } from '@icp-sdk/signer/agent';

// Connect to an asset wallet
const transport = new PostMessageTransport({ url: 'https://oisy.com/sign' });
const signer = new Signer({ transport });

// Get the user's accounts — some asset wallets return multiple (e.g. NFID),
// others only one (e.g. OISY).
// Each account has an `owner` (Principal) and an optional `subaccount`.
const accounts = await signer.getAccounts();
const account = accounts[0]; // Let the user choose if there are multiple

// Create an agent for the chosen account's principal.
// The agent only needs the owner — the principal that controls the account
// and on whose behalf canister calls are signed.
const agent = await SignerAgent.create({
  signer,
  account: account.owner,
});

// Use the agent with any canister library
import { IcrcLedgerCanister } from '@icp-sdk/canisters/ledger/icrc';

const icpLedger = IcrcLedgerCanister.create({
  agent,
  canisterId: ICP_LEDGER_CANISTER_ID,
});
await icpLedger.transfer({
  to: TARGET_ACCOUNT,
  amount: 100_000_000n,
});
```

## Authentication

Authentication providers issue delegations — temporary keys that can sign on behalf of the user. This is useful for session-based authentication where individual transaction approval is not needed.

```ts
import { Signer } from '@icp-sdk/signer';
import { PostMessageTransport } from '@icp-sdk/signer/web';
import { ECDSAKeyIdentity, DelegationIdentity } from '@icp-sdk/core/identity';
import { HttpAgent } from '@icp-sdk/core/agent';

// Connect to an authentication provider
const transport = new PostMessageTransport({ url: 'https://id.ai/authorize' });
const signer = new Signer({ transport });

// Create a session key and request a delegation
const sessionKey = await ECDSAKeyIdentity.generate();
const delegationChain = await signer.requestDelegation({
  publicKey: sessionKey.getPublicKey().toDer(),
});

// Create a DelegationIdentity that can sign without further user interaction
const identity = DelegationIdentity.fromDelegation(sessionKey, delegationChain);
const agent = await HttpAgent.create({ identity });
```

## TypeScript

This package requires the `node16` (or later) [`moduleResolution`](https://www.typescriptlang.org/tsconfig#moduleResolution) strategy.

## License

This project is licensed under the Apache-2.0 license.
