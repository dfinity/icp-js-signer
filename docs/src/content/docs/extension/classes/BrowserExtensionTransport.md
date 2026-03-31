---
title: BrowserExtensionTransport
editUrl: false
next: true
prev: true
---

Defined in: [src/extension/browserExtensionTransport.ts:57](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/extension/browserExtensionTransport.ts#L57)

ICRC-94 transport for communicating with browser extension signers.

Browser extensions announce themselves via `icrc94:announceProvider`
window events. Use [discover](#discover) to find installed extensions, or
[findTransport](#findtransport) to connect to a specific one by UUID.

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

Defined in: [src/extension/browserExtensionTransport.ts:60](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/extension/browserExtensionTransport.ts#L60)

#### Parameters

##### options

[`BrowserExtensionChannelOptions`](../interfaces/BrowserExtensionChannelOptions.md)

#### Returns

`BrowserExtensionTransport`

## Methods

### establishChannel()

> **establishChannel**(): `Promise`\<[`BrowserExtensionChannel`](BrowserExtensionChannel.md)\>

Defined in: [src/extension/browserExtensionTransport.ts:110](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/extension/browserExtensionTransport.ts#L110)

Creates a new [BrowserExtensionChannel](BrowserExtensionChannel.md) for this extension.

#### Returns

`Promise`\<[`BrowserExtensionChannel`](BrowserExtensionChannel.md)\>

#### Implementation of

[`Transport`](../../index/interfaces/Transport.md).[`establishChannel`](../../index/interfaces/Transport.md#establishchannel)

---

### discover()

> `static` **discover**(`__namedParameters?`): `Promise`\<[`ProviderDetail`](../interfaces/ProviderDetail.md)[]\>

Defined in: [src/extension/browserExtensionTransport.ts:74](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/extension/browserExtensionTransport.ts#L74)

Discovers all installed browser extension signers by dispatching
an `icrc94:requestProvider` event and collecting `icrc94:announceProvider`
responses. Waits for `discoveryDuration` ms before returning.

#### Parameters

##### \_\_namedParameters?

[`DiscoverBrowserExtensionOptions`](../interfaces/DiscoverBrowserExtensionOptions.md) = `{}`

#### Returns

`Promise`\<[`ProviderDetail`](../interfaces/ProviderDetail.md)[]\>

The discovered extension providers, deduplicated by UUID.

---

### findTransport()

> `static` **findTransport**(`options`): `Promise`\<`BrowserExtensionTransport`\>

Defined in: [src/extension/browserExtensionTransport.ts:96](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/extension/browserExtensionTransport.ts#L96)

Discovers extensions and connects to the one matching the given UUID.

#### Parameters

##### options

[`EstablishBrowserExtensionTransportOptions`](../interfaces/EstablishBrowserExtensionTransportOptions.md)

#### Returns

`Promise`\<`BrowserExtensionTransport`\>

#### Throws

If no extension with the given
UUID is found.
