---
title: EstablishBrowserExtensionTransportOptions
editUrl: false
next: true
prev: true
---

Defined in: [src/extension/browserExtensionTransport.ts:30](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/extension/browserExtensionTransport.ts#L30)

Options for [BrowserExtensionTransport.findTransport](../classes/BrowserExtensionTransport.md#findtransport).

## Extends

- [`DiscoverBrowserExtensionOptions`](DiscoverBrowserExtensionOptions.md).`Omit`\<[`BrowserExtensionTransportOptions`](../type-aliases/BrowserExtensionTransportOptions.md), `"providerDetail"`\>

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

#### Inherited from

[`DiscoverBrowserExtensionOptions`](DiscoverBrowserExtensionOptions.md).[`discoveryDuration`](DiscoverBrowserExtensionOptions.md#discoveryduration)

---

### uuid

> **uuid**: `string`

Defined in: [src/extension/browserExtensionTransport.ts:35](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/extension/browserExtensionTransport.ts#L35)

The UUID of the browser extension to connect to.

---

### window?

> `optional` **window?**: `Window`

Defined in: [src/extension/browserExtensionTransport.ts:26](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/extension/browserExtensionTransport.ts#L26)

The window to listen for extension events on.

#### Default

```ts
globalThis.window;
```

#### Inherited from

[`DiscoverBrowserExtensionOptions`](DiscoverBrowserExtensionOptions.md).[`window`](DiscoverBrowserExtensionOptions.md#window)
