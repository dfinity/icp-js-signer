---
title: SignerError
editUrl: false
next: true
prev: true
---

Defined in: [src/signer.ts:81](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/signer.ts#L81)

Error thrown when a signer returns a JSON-RPC error response
or when a transport-level failure occurs.

## Extends

- `Error`

## Constructors

### Constructor

> **new SignerError**(`error`, `options?`): `SignerError`

Defined in: [src/signer.ts:87](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/signer.ts#L87)

#### Parameters

##### error

`JsonRpcError`

##### options?

`ErrorOptions`

#### Returns

`SignerError`

#### Overrides

`Error.constructor`

## Properties

### cause?

> `optional` **cause?**: `unknown`

Defined in: docs/node_modules/typescript/lib/lib.es2022.error.d.ts:24

#### Inherited from

`Error.cause`

---

### code

> **code**: `number`

Defined in: [src/signer.ts:83](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/signer.ts#L83)

The JSON-RPC error code.

---

### data?

> `optional` **data?**: `unknown`

Defined in: [src/signer.ts:85](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/signer.ts#L85)

Optional additional error data from the signer.

---

### message

> **message**: `string`

Defined in: docs/node_modules/typescript/lib/lib.es5.d.ts:1075

#### Inherited from

`Error.message`

---

### name

> **name**: `string`

Defined in: docs/node_modules/typescript/lib/lib.es5.d.ts:1074

#### Inherited from

`Error.name`

---

### stack?

> `optional` **stack?**: `string`

Defined in: docs/node_modules/typescript/lib/lib.es5.d.ts:1076

#### Inherited from

`Error.stack`
