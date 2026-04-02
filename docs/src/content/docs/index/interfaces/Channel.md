---
title: Channel
editUrl: false
next: true
prev: true
---

Defined in: [src/transport.ts:16](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/transport.ts#L16)

## Properties

### closed

> **closed**: `boolean`

Defined in: [src/transport.ts:17](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/transport.ts#L17)

## Methods

### addEventListener()

#### Call Signature

> **addEventListener**(`event`, `listener`): () => `void`

Defined in: [src/transport.ts:19](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/transport.ts#L19)

##### Parameters

###### event

`"close"`

###### listener

() => `void`

##### Returns

() => `void`

#### Call Signature

> **addEventListener**(`event`, `listener`): () => `void`

Defined in: [src/transport.ts:21](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/transport.ts#L21)

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

Defined in: [src/transport.ts:25](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/transport.ts#L25)

#### Returns

`Promise`\<`void`\>

---

### send()

> **send**(`request`): `Promise`\<`void`\>

Defined in: [src/transport.ts:23](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/transport.ts#L23)

#### Parameters

##### request

`JsonRpcRequest`

#### Returns

`Promise`\<`void`\>
