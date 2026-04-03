---
title: ProviderDetail
editUrl: false
next: true
prev: true
---

Defined in: [src/extension/types.ts:8](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/extension/types.ts#L8)

Details about a browser extension signer, as announced via the
ICRC-94 `icrc94:announceProvider` event.

## See

https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_94_multi_injected_provider_discovery.md

## Properties

### dismiss

> **dismiss**: () => `Promise`\<`void`\>

Defined in: [src/extension/types.ts:20](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/extension/types.ts#L20)

Dismisses the extension's UI.

#### Returns

`Promise`\<`void`\>

---

### icon

> **icon**: `` `data:image/${string}` ``

Defined in: [src/extension/types.ts:14](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/extension/types.ts#L14)

Icon as a data URI (e.g. `data:image/svg+xml,...`).

---

### name

> **name**: `string`

Defined in: [src/extension/types.ts:12](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/extension/types.ts#L12)

Human-readable name of the signer.

---

### rdns

> **rdns**: `string`

Defined in: [src/extension/types.ts:16](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/extension/types.ts#L16)

Reverse domain name identifier (e.g. `com.example.wallet`).

---

### sendMessage

> **sendMessage**: (`message`) => `Promise`\<`unknown`\>

Defined in: [src/extension/types.ts:18](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/extension/types.ts#L18)

Sends a JSON-RPC request to the extension and returns the response.

#### Parameters

##### message

`JsonRpcRequest`

#### Returns

`Promise`\<`unknown`\>

---

### uuid

> **uuid**: `string`

Defined in: [src/extension/types.ts:10](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/extension/types.ts#L10)

Globally unique identifier (UUIDv4) for this extension.
