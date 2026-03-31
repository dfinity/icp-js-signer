---
title: ProviderDetail
editUrl: false
next: true
prev: true
---

Defined in: [src/extension/types.ts:9](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/extension/types.ts#L9)

Details about a browser extension signer, as announced via the
ICRC-94 `icrc94:announceProvider` event.

## See

https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_94_multi_injected_provider_discovery.md

## Properties

### dismiss

> **dismiss**: () => `Promise`\<`void`\>

Defined in: [src/extension/types.ts:21](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/extension/types.ts#L21)

Dismisses the extension's UI.

#### Returns

`Promise`\<`void`\>

---

### icon

> **icon**: `` `data:image/${string}` ``

Defined in: [src/extension/types.ts:15](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/extension/types.ts#L15)

Icon as a data URI (e.g. `data:image/svg+xml,...`).

---

### name

> **name**: `string`

Defined in: [src/extension/types.ts:13](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/extension/types.ts#L13)

Human-readable name of the signer.

---

### rdns

> **rdns**: `string`

Defined in: [src/extension/types.ts:17](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/extension/types.ts#L17)

Reverse domain name identifier (e.g. `com.example.wallet`).

---

### sendMessage

> **sendMessage**: (`message`) => `Promise`\<`unknown`\>

Defined in: [src/extension/types.ts:19](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/extension/types.ts#L19)

Sends a JSON-RPC request to the extension and returns the response.

#### Parameters

##### message

`JsonRpcRequest`

#### Returns

`Promise`\<`unknown`\>

---

### uuid

> **uuid**: `string`

Defined in: [src/extension/types.ts:11](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/extension/types.ts#L11)

Globally unique identifier (UUIDv4) for this extension.
