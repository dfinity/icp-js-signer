---
title: Signer
editUrl: false
next: true
prev: true
---

Defined in: [src/signer.ts:145](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/signer.ts#L145)

Client for interacting with an ICRC-25 compliant signer.

Signers are applications that hold private keys and can sign messages
on behalf of a user. They communicate over a [Transport](../interfaces/Transport.md) using
JSON-RPC 2.0 messages as defined by the ICRC-25 standard.

## See

https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_25_signer_interaction_standard.md

## Example

```ts
import { Signer } from '@icp-sdk/signer';
import { PostMessageTransport } from '@icp-sdk/signer/web';

const transport = new PostMessageTransport({ url: 'https://oisy.com/sign' });
const signer = new Signer({ transport });

const standards = await signer.getSupportedStandards();
const accounts = await signer.getAccounts();
```

## Type Parameters

### T

`T` _extends_ [`Transport`](../interfaces/Transport.md) = [`Transport`](../interfaces/Transport.md)

## Constructors

### Constructor

> **new Signer**\<`T`\>(`options`): `Signer`\<`T`\>

Defined in: [src/signer.ts:152](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/signer.ts#L152)

#### Parameters

##### options

[`SignerOptions`](../interfaces/SignerOptions.md)\<`T`\>

#### Returns

`Signer`\<`T`\>

## Accessors

### transport

#### Get Signature

> **get** **transport**(): `T`

Defined in: [src/signer.ts:162](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/signer.ts#L162)

The transport used to communicate with the signer.

##### Returns

`T`

## Methods

### callCanister()

> **callCanister**(`params`): `Promise`\<\{ `certificate`: `Uint8Array`; `contentMap`: `Uint8Array`; \}\>

Defined in: [src/signer.ts:386](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/signer.ts#L386)

Requests the signer to execute a canister call on behalf of the user.
The signer will prompt the user for approval before signing and
submitting the call to the Internet Computer.

#### Parameters

##### params

###### arg

`Uint8Array`

The Candid-encoded call arguments.

###### canisterId

`Principal`

The target canister.

###### method

`string`

The canister method to invoke.

###### nonce?

`Uint8Array`\<`ArrayBufferLike`\>

Optional nonce (max 32 bytes) for replay protection.

###### sender

`Principal`

The principal executing the call.

#### Returns

`Promise`\<\{ `certificate`: `Uint8Array`; `contentMap`: `Uint8Array`; \}\>

The CBOR-encoded content map and certificate from the IC,
which can be used to verify the call's execution.

#### See

https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_49_call_canister.md

---

### closeChannel()

> **closeChannel**(): `Promise`\<`void`\>

Defined in: [src/signer.ts:198](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/signer.ts#L198)

Closes the current communication channel, if open.

#### Returns

`Promise`\<`void`\>

---

### getAccounts()

> **getAccounts**(): `Promise`\<`object`[]\>

Defined in: [src/signer.ts:290](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/signer.ts#L290)

Requests the accounts managed by the signer.
Each account has an owner Principal and an optional 32-byte subaccount.

Requires the `icrc27_accounts` permission scope.

#### Returns

`Promise`\<`object`[]\>

#### See

https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_27_accounts.md

---

### getPermissions()

> **getPermissions**(): `Promise`\<`object`[]\>

Defined in: [src/signer.ts:262](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/signer.ts#L262)

Queries the current state of all permission scopes.

#### Returns

`Promise`\<`object`[]\>

The current permission state for each scope the signer supports.

---

### getSupportedStandards()

> **getSupportedStandards**(): `Promise`\<[`SupportedStandard`](../type-aliases/SupportedStandard.md)[]\>

Defined in: [src/signer.ts:208](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/signer.ts#L208)

Queries which ICRC standards the signer supports.
Use this to determine signer capabilities before calling other methods.

#### Returns

`Promise`\<[`SupportedStandard`](../type-aliases/SupportedStandard.md)[]\>

#### See

https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_25_signer_interaction_standard.md

---

### openChannel()

> **openChannel**(): `Promise`\<[`Channel`](../interfaces/Channel.md)\>

Defined in: [src/signer.ts:170](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/signer.ts#L170)

Opens a communication channel with the signer.
Reuses an existing open channel if available.

#### Returns

`Promise`\<[`Channel`](../interfaces/Channel.md)\>

---

### requestDelegation()

> **requestDelegation**(`params`): `Promise`\<`DelegationChain`\>

Defined in: [src/signer.ts:325](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/signer.ts#L325)

Requests a delegation chain from the signer for session-based authentication.
This allows the relying party to sign canister calls without requiring
user approval for each individual call.

#### Parameters

##### params

###### maxTimeToLive?

`bigint`

Optional maximum delegation lifetime in nanoseconds.

###### publicKey

`PublicKey`

The session's public key to delegate to.

###### targets?

`Principal`[]

Optional canister IDs to restrict the delegation to.
When provided, the signer creates an account delegation; otherwise a
relying party delegation.

#### Returns

`Promise`\<`DelegationChain`\>

A DelegationChain that can be used with `DelegationIdentity`.

#### See

https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_34_delegation.md

---

### requestPermissions()

> **requestPermissions**(`scopes`): `Promise`\<`object`[]\>

Defined in: [src/signer.ts:233](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/signer.ts#L233)

Requests the signer to grant permission for the given scopes.
The signer may prompt the user for approval.

#### Parameters

##### scopes

[`PermissionScope`](../type-aliases/PermissionScope.md)[]

The permission scopes to request.

#### Returns

`Promise`\<`object`[]\>

The current state of each requested scope after the user's decision.
