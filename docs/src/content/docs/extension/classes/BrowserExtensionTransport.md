---
title: BrowserExtensionTransport
editUrl: false
next: true
prev: true
---

Defined in: [src/extension/browserExtensionTransport.ts:55](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/extension/browserExtensionTransport.ts#L55)

ICRC-94 transport for communicating with browser extension signers.

Browser extensions announce themselves via `icrc94:announceProvider`
window events. Use [BrowserExtensionTransport.discover](#discover) to find installed extensions, or
[BrowserExtensionTransport.findTransport](#findtransport) to connect to a specific one by UUID.

## See

https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_94_multi_injected_provider_discovery.md

## Example

```ts
// Discover all installed extensions
const providers = await BrowserExtensionTransport.discover();

// Or connect to a specific extension by UUID
const transport = await BrowserExtensionTransport.findTransport({ uuid: '...' });
const signer = new Signer({ transport });
```

## Implements

- [`Transport`](../../index/interfaces/Transport.md)

## Constructors

### Constructor

> **new BrowserExtensionTransport**(`options`): `BrowserExtensionTransport`

Defined in: [src/extension/browserExtensionTransport.ts:58](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/extension/browserExtensionTransport.ts#L58)

#### Parameters

##### options

[`BrowserExtensionChannelOptions`](../interfaces/BrowserExtensionChannelOptions.md)

#### Returns

`BrowserExtensionTransport`

## Methods

### establishChannel()

> **establishChannel**(): `Promise`\<[`BrowserExtensionChannel`](BrowserExtensionChannel.md)\>

Defined in: [src/extension/browserExtensionTransport.ts:110](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/extension/browserExtensionTransport.ts#L110)

Creates a new [BrowserExtensionChannel](BrowserExtensionChannel.md) for this extension.

#### Returns

`Promise`\<[`BrowserExtensionChannel`](BrowserExtensionChannel.md)\>

#### Implementation of

[`Transport`](../../index/interfaces/Transport.md).[`establishChannel`](../../index/interfaces/Transport.md#establishchannel)

---

### discover()

> `static` **discover**(`root0?`): `Promise`\<[`ProviderDetail`](../interfaces/ProviderDetail.md)[]\>

Defined in: [src/extension/browserExtensionTransport.ts:74](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/extension/browserExtensionTransport.ts#L74)

Discovers all installed browser extension signers by dispatching
an `icrc94:requestProvider` event and collecting `icrc94:announceProvider`
responses. Waits for `discoveryDuration` ms before returning.

#### Parameters

##### root0?

[`DiscoverBrowserExtensionOptions`](../interfaces/DiscoverBrowserExtensionOptions.md) = `{}`

The discovery options.

#### Returns

`Promise`\<[`ProviderDetail`](../interfaces/ProviderDetail.md)[]\>

The discovered extension providers, deduplicated by UUID.

---

### findTransport()

> `static` **findTransport**(`options`): `Promise`\<`BrowserExtensionTransport`\>

Defined in: [src/extension/browserExtensionTransport.ts:96](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/extension/browserExtensionTransport.ts#L96)

Discovers extensions and connects to the one matching the given UUID.

#### Parameters

##### options

[`EstablishBrowserExtensionTransportOptions`](../interfaces/EstablishBrowserExtensionTransportOptions.md)

The options including UUID and discovery settings.

#### Returns

`Promise`\<`BrowserExtensionTransport`\>

#### Throws

If no extension with the given
UUID is found.
