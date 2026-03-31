---
title: BrowserExtensionChannelOptions
editUrl: false
next: true
prev: true
---

Defined in: [src/extension/browserExtensionChannel.ts:11](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/extension/browserExtensionChannel.ts#L11)

Options for creating a [BrowserExtensionChannel](../classes/BrowserExtensionChannel.md).

## Properties

### providerDetail

> **providerDetail**: [`ProviderDetail`](ProviderDetail.md)

Defined in: [src/extension/browserExtensionChannel.ts:13](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/extension/browserExtensionChannel.ts#L13)

The provider details obtained during extension discovery.

---

### window?

> `optional` **window?**: `Window`

Defined in: [src/extension/browserExtensionChannel.ts:18](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/extension/browserExtensionChannel.ts#L18)

The window to listen for extension events on.

#### Default

```ts
globalThis.window;
```
