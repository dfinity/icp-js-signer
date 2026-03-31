---
title: SignerOptions
editUrl: false
next: true
prev: true
---

Defined in: [src/signer.ts:97](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/signer.ts#L97)

Options for creating a [Signer](../classes/Signer.md) instance.

## Type Parameters

### T

`T` _extends_ [`Transport`](Transport.md)

## Properties

### autoCloseTransportChannel?

> `optional` **autoCloseTransportChannel?**: `boolean`

Defined in: [src/signer.ts:104](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/signer.ts#L104)

Automatically close the transport channel after a response is received.

#### Default

```ts
true;
```

---

### closeTransportChannelAfter?

> `optional` **closeTransportChannelAfter?**: `number`

Defined in: [src/signer.ts:109](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/signer.ts#L109)

Delay in milliseconds before auto-closing the transport channel.

#### Default

```ts
200;
```

---

### crypto?

> `optional` **crypto?**: `Pick`\<`Crypto`, `"randomUUID"`\>

Defined in: [src/signer.ts:114](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/signer.ts#L114)

Source of random UUIDs for JSON-RPC request IDs.

#### Default

```ts
globalThis.crypto;
```

---

### derivationOrigin?

> `optional` **derivationOrigin?**: `string`

Defined in: [src/signer.ts:121](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/signer.ts#L121)

Derivation origin for ICRC-95 identity derivation.
When set, all requests include an `icrc95DerivationOrigin` param.

#### See

https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_95_derivationorigin.md

---

### transport

> **transport**: `T`

Defined in: [src/signer.ts:99](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/signer.ts#L99)

The transport used to communicate with the signer.
