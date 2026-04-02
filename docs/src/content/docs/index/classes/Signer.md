---
title: Signer
editUrl: false
next: true
prev: true
---

Defined in: [src/signer.ts:141](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/signer.ts#L141)

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

Defined in: [src/signer.ts:148](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/signer.ts#L148)

#### Parameters

##### options

[`SignerOptions`](../interfaces/SignerOptions.md)\<`T`\>

#### Returns

`Signer`\<`T`\>

## Accessors

### transport

#### Get Signature

> **get** **transport**(): `T`

Defined in: [src/signer.ts:158](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/signer.ts#L158)

The transport used to communicate with the signer.

##### Returns

`T`

## Methods

### callCanister()

> **callCanister**(`params`): `Promise`\<\{ `certificate`: `Uint8Array`; `contentMap`: `Uint8Array`; \}\>

Defined in: [src/signer.ts:460](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/signer.ts#L460)

Requests the signer to execute a canister call on behalf of the user.
The signer will prompt the user for approval before signing and
submitting the call to the Internet Computer.

#### Parameters

##### params

The canister call parameters.

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

Defined in: [src/signer.ts:194](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/signer.ts#L194)

Closes the current communication channel, if open.

#### Returns

`Promise`\<`void`\>

---

### getAccounts()

> **getAccounts**(): `Promise`\<`object`[]\>

Defined in: [src/signer.ts:362](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/signer.ts#L362)

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

Defined in: [src/signer.ts:333](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/signer.ts#L333)

Queries the current state of all permission scopes.

#### Returns

`Promise`\<`object`[]\>

The current permission state for each scope the signer supports.

---

### getSupportedStandards()

> **getSupportedStandards**(): `Promise`\<[`SupportedStandard`](../interfaces/SupportedStandard.md)[]\>

Defined in: [src/signer.ts:275](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/signer.ts#L275)

Queries which ICRC standards the signer supports.
Use this to determine signer capabilities before calling other methods.

#### Returns

`Promise`\<[`SupportedStandard`](../interfaces/SupportedStandard.md)[]\>

#### See

https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_25_signer_interaction_standard.md

---

### openChannel()

> **openChannel**(): `Promise`\<[`Channel`](../interfaces/Channel.md)\>

Defined in: [src/signer.ts:166](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/signer.ts#L166)

Opens a communication channel with the signer.
Reuses an existing open channel if available.

#### Returns

`Promise`\<[`Channel`](../interfaces/Channel.md)\>

---

### requestDelegation()

> **requestDelegation**(`params`): `Promise`\<`DelegationChain`\>

Defined in: [src/signer.ts:400](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/signer.ts#L400)

Requests a delegation chain from the signer for session-based authentication.
This allows the relying party to sign canister calls without requiring
user approval for each individual call.

#### Parameters

##### params

The delegation request parameters.

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

Defined in: [src/signer.ts:303](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/signer.ts#L303)

Requests the signer to grant permission for the given scopes.
The signer may prompt the user for approval.

#### Parameters

##### scopes

[`PermissionScope`](../type-aliases/PermissionScope.md)[]

The permission scopes to request.

#### Returns

`Promise`\<`object`[]\>

The current state of each requested scope after the user's decision.

---

### sendRequest()

> **sendRequest**(`request`): `Promise`\<`JsonRpcResponse`\>

Defined in: [src/signer.ts:202](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/signer.ts#L202)

Sends a JSON-RPC request over the transport channel.

#### Parameters

##### request

`JsonRpcRequest`

The JSON-RPC request to send.

#### Returns

`Promise`\<`JsonRpcResponse`\>
