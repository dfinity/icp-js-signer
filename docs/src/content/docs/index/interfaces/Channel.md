---
title: Channel
editUrl: false
next: true
prev: true
---

Defined in: [src/transport.ts:12](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/transport.ts#L12)

## Properties

### closed

> **closed**: `boolean`

Defined in: [src/transport.ts:13](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/transport.ts#L13)

## Methods

### addEventListener()

#### Call Signature

> **addEventListener**(`event`, `listener`): () => `void`

Defined in: [src/transport.ts:15](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/transport.ts#L15)

##### Parameters

###### event

`"close"`

###### listener

() => `void`

##### Returns

() => `void`

#### Call Signature

> **addEventListener**(`event`, `listener`): () => `void`

Defined in: [src/transport.ts:17](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/transport.ts#L17)

##### Parameters

###### event

`"response"`

###### listener

(`response`) => `void`

##### Returns

() => `void`

---

### close()

> **close**(): `Promise`\<`void`\>

Defined in: [src/transport.ts:21](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/transport.ts#L21)

#### Returns

`Promise`\<`void`\>

---

### send()

> **send**(`request`): `Promise`\<`void`\>

Defined in: [src/transport.ts:19](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/transport.ts#L19)

#### Parameters

##### request

`JsonRpcRequest`

#### Returns

`Promise`\<`void`\>
