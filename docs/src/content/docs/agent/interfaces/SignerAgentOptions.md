---
title: SignerAgentOptions
editUrl: false
next: true
prev: true
---

Defined in: [src/agent/agent.ts:58](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/agent/agent.ts#L58)

Options for creating a [SignerAgent](../classes/SignerAgent.md).

## Type Parameters

### T

`T` _extends_ [`Transport`](../../index/interfaces/Transport.md) = [`Transport`](../../index/interfaces/Transport.md)

## Properties

### account

> **account**: `Principal`

Defined in: [src/agent/agent.ts:62](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/agent/agent.ts#L62)

The principal of the account on whose behalf canister calls are made.

---

### agent?

> `optional` **agent?**: `HttpAgent`

Defined in: [src/agent/agent.ts:67](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/agent/agent.ts#L67)

An HttpAgent used for fetching the root key and status.

#### Default

```ts
A new HttpAgent connected to the IC mainnet.
```

---

### signer

> **signer**: [`Signer`](../../index/classes/Signer.md)\<`T`\>

Defined in: [src/agent/agent.ts:60](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/agent/agent.ts#L60)

The [Signer](../../index/classes/Signer.md) used to send ICRC-49 canister call requests.
