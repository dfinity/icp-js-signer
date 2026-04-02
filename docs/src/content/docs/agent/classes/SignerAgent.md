---
title: SignerAgent
editUrl: false
next: true
prev: true
---

Defined in: [src/agent/agent.ts:100](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/agent/agent.ts#L100)

An Agent implementation that routes canister calls through a
[Signer](../../index/classes/Signer.md) for user approval. Drop-in replacement for HttpAgent
when canister calls need to be signed by an external signer.

Calls are sent to the signer via ICRC-49, and the returned content map
and certificate are validated before being returned to the caller.

Use [SignerAgent.create](#create) or [SignerAgent.createSync](#createsync) to
construct an instance — the constructor is private.

## Example

```ts
const agent = await SignerAgent.create({ signer, account });
const result = await agent.update(canisterId, {
  methodName: 'transfer',
  arg,
  effectiveCanisterId: canisterId,
});
```

## Type Parameters

### T

`T` _extends_ [`Transport`](../../index/interfaces/Transport.md) = [`Transport`](../../index/interfaces/Transport.md)

## Implements

- `Agent`

## Accessors

### rootKey

#### Get Signature

> **get** **rootKey**(): `Uint8Array`\<`ArrayBufferLike`\>

Defined in: [src/agent/agent.ts:116](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/agent/agent.ts#L116)

The root key used for certificate verification.

##### Returns

`Uint8Array`\<`ArrayBufferLike`\>

#### Implementation of

`Agent.rootKey`

---

### signer

#### Get Signature

> **get** **signer**(): [`Signer`](../../index/classes/Signer.md)\<`T`\>

Defined in: [src/agent/agent.ts:121](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/agent/agent.ts#L121)

The signer this agent routes calls through.

##### Returns

[`Signer`](../../index/classes/Signer.md)\<`T`\>

## Methods

### call()

> **call**(`canisterId`, `fields`): `Promise`\<`SubmitResponse`\>

Defined in: [src/agent/agent.ts:237](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/agent/agent.ts#L237)

Sends a canister call through the signer.
Returns the request ID and a synthetic HTTP response.

#### Parameters

##### canisterId

`string` \| `Principal`

The target canister principal or its text representation.

##### fields

`CallOptions`

The call options including method name and arguments.

#### Returns

`Promise`\<`SubmitResponse`\>

#### Implementation of

`Agent.call`

---

### createReadStateRequest()

> **createReadStateRequest**(`_options`, `_identity?`): `Promise`\<`unknown`\>

Defined in: [src/agent/agent.ts:333](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/agent/agent.ts#L333)

**`Internal`**

#### Parameters

##### \_options

`ReadStateOptions`

The read state options.

##### \_identity?

`Identity`

The identity to use for the request.

#### Returns

`Promise`\<`unknown`\>

#### Implementation of

`Agent.createReadStateRequest`

---

### fetchRootKey()

> **fetchRootKey**(): `Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

Defined in: [src/agent/agent.ts:319](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/agent/agent.ts#L319)

Fetches the IC root key via the underlying HttpAgent.

#### Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

#### Implementation of

`Agent.fetchRootKey`

---

### getPrincipal()

> **getPrincipal**(): `Promise`\<`Principal`\>

Defined in: [src/agent/agent.ts:324](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/agent/agent.ts#L324)

Returns the account principal this agent makes calls on behalf of.

#### Returns

`Promise`\<`Principal`\>

#### Implementation of

`Agent.getPrincipal`

---

### query()

> **query**(`canisterId`, `options`, `_identity?`): `Promise`\<`ApiQueryResponse`\>

Defined in: [src/agent/agent.ts:294](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/agent/agent.ts#L294)

Executes a query by upgrading it to a canister call through the signer.
The signer signs and submits the call, and the reply is extracted
from the certified response.

#### Parameters

##### canisterId

`string` \| `Principal`

The target canister principal or its text representation.

##### options

`QueryFields`

The query fields including method name and arguments.

##### \_identity?

`Identity` \| `Promise`\<`Identity`\>

Ignored. The signer manages identity internally.

#### Returns

`Promise`\<`ApiQueryResponse`\>

#### Implementation of

`Agent.query`

---

### readState()

> **readState**(`_canisterId`, `options`, `_identity?`, `_request?`): `Promise`\<`ReadStateResponse`\>

Defined in: [src/agent/agent.ts:348](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/agent/agent.ts#L348)

Returns the raw certificate for a previously completed call.
The certificate is deleted after being read (single-use).

Only supports `request_status` paths for request IDs that were
returned by a prior [call](#call), [update](#update), or [query](#query).

#### Parameters

##### \_canisterId

`string` \| `Principal`

The target canister principal (unused).

##### options

`ReadStateOptions`

The read state options containing paths to look up.

##### \_identity?

`Identity` \| `Promise`\<`Identity`\>

The identity to use (unused).

##### \_request?

`unknown`

The request object (unused).

#### Returns

`Promise`\<`ReadStateResponse`\>

#### Implementation of

`Agent.readState`

---

### replaceAccount()

> **replaceAccount**(`account`): `void`

Defined in: [src/agent/agent.ts:380](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/agent/agent.ts#L380)

Replaces the account principal used for subsequent calls.

#### Parameters

##### account

`Principal`

The new account principal to use for subsequent calls.

#### Returns

`void`

---

### status()

> **status**(): `Promise`\<`JsonObject`\>

Defined in: [src/agent/agent.ts:372](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/agent/agent.ts#L372)

Queries the IC replica status via the underlying HttpAgent.

#### Returns

`Promise`\<`JsonObject`\>

#### Implementation of

`Agent.status`

---

### update()

> **update**(`canisterId`, `fields`, `_pollingOptions?`): `Promise`\<`UpdateResult`\>

Defined in: [src/agent/agent.ts:261](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/agent/agent.ts#L261)

Executes a canister update call and returns the certified result.
Combines [call](#call) with certificate validation and reply extraction.

#### Parameters

##### canisterId

`string` \| `Principal`

The target canister principal or its text representation.

##### fields

`CallOptions`

The call options including method name and arguments.

##### \_pollingOptions?

`unknown`

Ignored. The signer already returns the
certificate with the reply in a single round-trip.

#### Returns

`Promise`\<`UpdateResult`\>

#### Implementation of

`Agent.update`

---

### create()

> `static` **create**\<`T`\>(`options`): `Promise`\<`SignerAgent`\<`T`\>\>

Defined in: [src/agent/agent.ts:130](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/agent/agent.ts#L130)

Creates a new SignerAgent, asynchronously initializing the
underlying HttpAgent if one is not provided.

#### Type Parameters

##### T

`T` _extends_ [`Transport`](../../index/interfaces/Transport.md)

#### Parameters

##### options

[`SignerAgentOptions`](../interfaces/SignerAgentOptions.md)\<`T`\>

The signer agent options.

#### Returns

`Promise`\<`SignerAgent`\<`T`\>\>

---

### createSync()

> `static` **createSync**\<`T`\>(`options`): `SignerAgent`\<`T`\>

Defined in: [src/agent/agent.ts:143](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/agent/agent.ts#L143)

Creates a new SignerAgent synchronously.
Use this when you already have an HttpAgent or don't need async initialization.

#### Type Parameters

##### T

`T` _extends_ [`Transport`](../../index/interfaces/Transport.md)

#### Parameters

##### options

[`SignerAgentOptions`](../interfaces/SignerAgentOptions.md)\<`T`\>

The signer agent options.

#### Returns

`SignerAgent`\<`T`\>
