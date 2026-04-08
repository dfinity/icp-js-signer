---
title: SignerOptions
editUrl: false
next: true
prev: true
---

Defined in: [src/signer.ts:128](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/signer.ts#L128)

Options for creating a [Signer](../classes/Signer.md) instance.

## Type Parameters

### T

`T` _extends_ [`Transport`](Transport.md)

## Properties

### autoCloseTransportChannel?

> `optional` **autoCloseTransportChannel?**: `boolean`

Defined in: [src/signer.ts:135](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/signer.ts#L135)

Automatically close the transport channel after a response is received.

#### Default

```ts
true;
```

---

### closeTransportChannelAfter?

> `optional` **closeTransportChannelAfter?**: `number`

Defined in: [src/signer.ts:140](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/signer.ts#L140)

Delay in milliseconds before auto-closing the transport channel.

#### Default

```ts
200;
```

---

### crypto?

> `optional` **crypto?**: `Pick`\<`Crypto`, `"randomUUID"`\>

Defined in: [src/signer.ts:145](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/signer.ts#L145)

Source of random UUIDs for JSON-RPC request IDs.

#### Default

```ts
globalThis.crypto;
```

---

### derivationOrigin?

> `optional` **derivationOrigin?**: `string`

Defined in: [src/signer.ts:156](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/signer.ts#L156)

Derivation origin for ICRC-95 identity derivation.
When set, all requests include an `icrc95DerivationOrigin` param.

#### See

https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_95_derivationorigin.md

---

### transforms?

> `optional` **transforms?**: [`SignerRequestTransformFn`](../type-aliases/SignerRequestTransformFn.md)[]

Defined in: [src/signer.ts:150](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/signer.ts#L150)

Additional transform functions applied to each outgoing JSON-RPC request.
Transforms are applied in order; each receives the output of the previous one.

---

### transport

> **transport**: `T`

Defined in: [src/signer.ts:130](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/signer.ts#L130)

The transport used to communicate with the signer.
