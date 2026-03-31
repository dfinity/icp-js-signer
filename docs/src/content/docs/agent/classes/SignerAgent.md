---
title: SignerAgent
editUrl: false
next: true
prev: true
---

Defined in: [src/agent/agent.ts:101](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/agent/agent.ts#L101)

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

Defined in: [src/agent/agent.ts:117](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/agent/agent.ts#L117)

The root key used for certificate verification.

##### Returns

`Uint8Array`\<`ArrayBufferLike`\>

#### Implementation of

`Agent.rootKey`

---

### signer

#### Get Signature

> **get** **signer**(): [`Signer`](../../index/classes/Signer.md)\<`T`\>

Defined in: [src/agent/agent.ts:122](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/agent/agent.ts#L122)

The signer this agent routes calls through.

##### Returns

[`Signer`](../../index/classes/Signer.md)\<`T`\>

## Methods

### call()

> **call**(`canisterId`, `fields`): `Promise`\<`SubmitResponse`\>

Defined in: [src/agent/agent.ts:232](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/agent/agent.ts#L232)

Sends a canister call through the signer.
Returns the request ID and a synthetic HTTP response.

#### Parameters

##### canisterId

`string` \| `Principal`

##### fields

`CallOptions`

#### Returns

`Promise`\<`SubmitResponse`\>

#### Implementation of

`Agent.call`

---

### createReadStateRequest()

> **createReadStateRequest**(`_options`, `_identity?`): `Promise`\<`unknown`\>

Defined in: [src/agent/agent.ts:322](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/agent/agent.ts#L322)

**`Internal`**

Required by the Agent interface but not used for signer calls.

#### Parameters

##### \_options

`ReadStateOptions`

##### \_identity?

`Identity`

#### Returns

`Promise`\<`unknown`\>

#### Implementation of

`Agent.createReadStateRequest`

---

### fetchRootKey()

> **fetchRootKey**(): `Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

Defined in: [src/agent/agent.ts:312](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/agent/agent.ts#L312)

Fetches the IC root key via the underlying HttpAgent.

#### Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

#### Implementation of

`Agent.fetchRootKey`

---

### getPrincipal()

> **getPrincipal**(): `Promise`\<`Principal`\>

Defined in: [src/agent/agent.ts:317](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/agent/agent.ts#L317)

Returns the account principal this agent makes calls on behalf of.

#### Returns

`Promise`\<`Principal`\>

#### Implementation of

`Agent.getPrincipal`

---

### query()

> **query**(`canisterId`, `options`, `_identity?`): `Promise`\<`ApiQueryResponse`\>

Defined in: [src/agent/agent.ts:287](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/agent/agent.ts#L287)

Executes a query by upgrading it to a canister call through the signer.
The signer signs and submits the call, and the reply is extracted
from the certified response.

#### Parameters

##### canisterId

`string` \| `Principal`

##### options

`QueryFields`

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

Defined in: [src/agent/agent.ts:333](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/agent/agent.ts#L333)

Returns the raw certificate for a previously completed call.
The certificate is deleted after being read (single-use).

Only supports `request_status` paths for request IDs that were
returned by a prior [call](#call), [update](#update), or [query](#query).

#### Parameters

##### \_canisterId

`string` \| `Principal`

##### options

`ReadStateOptions`

##### \_identity?

`Identity` \| `Promise`\<`Identity`\>

##### \_request?

`unknown`

#### Returns

`Promise`\<`ReadStateResponse`\>

#### Implementation of

`Agent.readState`

---

### replaceAccount()

> **replaceAccount**(`account`): `void`

Defined in: [src/agent/agent.ts:362](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/agent/agent.ts#L362)

Replaces the account principal used for subsequent calls.

#### Parameters

##### account

`Principal`

#### Returns

`void`

---

### status()

> **status**(): `Promise`\<`JsonObject`\>

Defined in: [src/agent/agent.ts:357](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/agent/agent.ts#L357)

Queries the IC replica status via the underlying HttpAgent.

#### Returns

`Promise`\<`JsonObject`\>

#### Implementation of

`Agent.status`

---

### update()

> **update**(`canisterId`, `fields`, `_pollingOptions?`): `Promise`\<`UpdateResult`\>

Defined in: [src/agent/agent.ts:255](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/agent/agent.ts#L255)

Executes a canister update call and returns the certified result.
Combines [call](#call) with certificate validation and reply extraction.

#### Parameters

##### canisterId

`string` \| `Principal`

##### fields

`CallOptions`

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

Defined in: [src/agent/agent.ts:130](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/agent/agent.ts#L130)

Creates a new SignerAgent, asynchronously initializing the
underlying HttpAgent if one is not provided.

#### Type Parameters

##### T

`T` _extends_ [`Transport`](../../index/interfaces/Transport.md)

#### Parameters

##### options

[`SignerAgentOptions`](../interfaces/SignerAgentOptions.md)\<`T`\>

#### Returns

`Promise`\<`SignerAgent`\<`T`\>\>

---

### createSync()

> `static` **createSync**\<`T`\>(`options`): `SignerAgent`\<`T`\>

Defined in: [src/agent/agent.ts:142](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/agent/agent.ts#L142)

Creates a new SignerAgent synchronously.
Use this when you already have an HttpAgent or don't need async initialization.

#### Type Parameters

##### T

`T` _extends_ [`Transport`](../../index/interfaces/Transport.md)

#### Parameters

##### options

[`SignerAgentOptions`](../interfaces/SignerAgentOptions.md)\<`T`\>

#### Returns

`SignerAgent`\<`T`\>
