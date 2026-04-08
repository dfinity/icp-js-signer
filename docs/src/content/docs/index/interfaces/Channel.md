---
title: Channel
editUrl: false
next: true
prev: true
---

Defined in: [src/transport.ts:16](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/transport.ts#L16)

## Properties

### closed

> **closed**: `boolean`

Defined in: [src/transport.ts:17](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/transport.ts#L17)

## Methods

### addEventListener()

#### Call Signature

> **addEventListener**(`event`, `listener`): () => `void`

Defined in: [src/transport.ts:19](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/transport.ts#L19)

##### Parameters

###### event

`"close"`

###### listener

() => `void`

##### Returns

() => `void`

#### Call Signature

> **addEventListener**(`event`, `listener`): () => `void`

Defined in: [src/transport.ts:21](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/transport.ts#L21)

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

Defined in: [src/transport.ts:25](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/transport.ts#L25)

#### Returns

`Promise`\<`void`\>

---

### send()

> **send**(`request`): `Promise`\<`void`\>

Defined in: [src/transport.ts:23](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/transport.ts#L23)

#### Parameters

##### request

`JsonRpcRequest`

#### Returns

`Promise`\<`void`\>
