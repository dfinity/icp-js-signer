---
title: DiscoverBrowserExtensionOptions
editUrl: false
next: true
prev: true
---

Defined in: [src/extension/browserExtensionTransport.ts:15](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/extension/browserExtensionTransport.ts#L15)

Options for [BrowserExtensionTransport.discover](../classes/BrowserExtensionTransport.md#discover).

## Extended by

- [`EstablishBrowserExtensionTransportOptions`](EstablishBrowserExtensionTransportOptions.md)

## Properties

### discoveryDuration?

> `optional` **discoveryDuration?**: `number`

Defined in: [src/extension/browserExtensionTransport.ts:21](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/extension/browserExtensionTransport.ts#L21)

Time in milliseconds to wait for browser extensions to announce themselves
via `icrc94:announceProvider` events.

#### Default

```ts
100;
```

---

### window?

> `optional` **window?**: `Window`

Defined in: [src/extension/browserExtensionTransport.ts:26](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/extension/browserExtensionTransport.ts#L26)

The window to listen for extension events on.

#### Default

```ts
globalThis.window;
```
