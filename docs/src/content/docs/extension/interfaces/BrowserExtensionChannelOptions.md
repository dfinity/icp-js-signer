---
title: BrowserExtensionChannelOptions
editUrl: false
next: true
prev: true
---

Defined in: [src/extension/browserExtensionChannel.ts:11](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/extension/browserExtensionChannel.ts#L11)

Options for creating a [BrowserExtensionChannel](../classes/BrowserExtensionChannel.md).

## Properties

### providerDetail

> **providerDetail**: [`ProviderDetail`](ProviderDetail.md)

Defined in: [src/extension/browserExtensionChannel.ts:13](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/extension/browserExtensionChannel.ts#L13)

The provider details obtained during extension discovery.

---

### window?

> `optional` **window?**: `Window`

Defined in: [src/extension/browserExtensionChannel.ts:18](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/extension/browserExtensionChannel.ts#L18)

The window to listen for extension events on.

#### Default

```ts
globalThis.window;
```
