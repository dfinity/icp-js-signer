---
title: SignerOptions
editUrl: false
next: true
prev: true
---

Defined in: [src/signer.ts:96](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/signer.ts#L96)

Options for creating a [Signer](../classes/Signer.md) instance.

## Type Parameters

### T

`T` _extends_ [`Transport`](Transport.md)

## Properties

### autoCloseTransportChannel?

> `optional` **autoCloseTransportChannel?**: `boolean`

Defined in: [src/signer.ts:103](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/signer.ts#L103)

Automatically close the transport channel after a response is received.

#### Default

```ts
true;
```

---

### closeTransportChannelAfter?

> `optional` **closeTransportChannelAfter?**: `number`

Defined in: [src/signer.ts:108](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/signer.ts#L108)

Delay in milliseconds before auto-closing the transport channel.

#### Default

```ts
200;
```

---

### crypto?

> `optional` **crypto?**: `Pick`\<`Crypto`, `"randomUUID"`\>

Defined in: [src/signer.ts:113](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/signer.ts#L113)

Source of random UUIDs for JSON-RPC request IDs.

#### Default

```ts
globalThis.crypto;
```

---

### derivationOrigin?

> `optional` **derivationOrigin?**: `string`

Defined in: [src/signer.ts:119](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/signer.ts#L119)

Derivation origin for ICRC-95 identity derivation.
When set, all requests include an `icrc95DerivationOrigin` param.

#### See

https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_95_derivationorigin.md

---

### transport

> **transport**: `T`

Defined in: [src/signer.ts:98](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/signer.ts#L98)

The transport used to communicate with the signer.
