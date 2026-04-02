---
title: BrowserExtensionChannel
editUrl: false
next: true
prev: true
---

Defined in: [src/extension/browserExtensionChannel.ts:30](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/extension/browserExtensionChannel.ts#L30)

A [Channel](../../index/interfaces/Channel.md) implementation that communicates with a browser
extension signer via the ICRC-94 provider API.

Messages are sent through `providerDetail.sendMessage` and responses
are validated as JSON-RPC before being dispatched to listeners.
The channel is automatically closed if the extension fires an
`icrc94:unexpectedlyClosed` event.

## Implements

- [`Channel`](../../index/interfaces/Channel.md)

## Constructors

### Constructor

> **new BrowserExtensionChannel**(`options`): `BrowserExtensionChannel`

Defined in: [src/extension/browserExtensionChannel.ts:36](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/extension/browserExtensionChannel.ts#L36)

#### Parameters

##### options

[`BrowserExtensionChannelOptions`](../interfaces/BrowserExtensionChannelOptions.md)

#### Returns

`BrowserExtensionChannel`

## Accessors

### closed

#### Get Signature

> **get** **closed**(): `boolean`

Defined in: [src/extension/browserExtensionChannel.ts:54](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/extension/browserExtensionChannel.ts#L54)

Whether this channel has been closed.

##### Returns

`boolean`

#### Implementation of

[`Channel`](../../index/interfaces/Channel.md).[`closed`](../../index/interfaces/Channel.md#closed)

## Methods

### addEventListener()

> **addEventListener**(...`__namedParameters`): () => `void`

Defined in: [src/extension/browserExtensionChannel.ts:58](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/extension/browserExtensionChannel.ts#L58)

#### Parameters

##### \_\_namedParameters

\[`"close"`, () => `void`\] \| \[`"response"`, (`response`) => `void`\]

#### Returns

() => `void`

#### Implementation of

[`Channel`](../../index/interfaces/Channel.md).[`addEventListener`](../../index/interfaces/Channel.md#addeventlistener)

---

### close()

> **close**(): `Promise`\<`void`\>

Defined in: [src/extension/browserExtensionChannel.ts:98](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/extension/browserExtensionChannel.ts#L98)

Dismisses the extension and notifies all close listeners.

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`Channel`](../../index/interfaces/Channel.md).[`close`](../../index/interfaces/Channel.md#close)

---

### send()

> **send**(`request`): `Promise`\<`void`\>

Defined in: [src/extension/browserExtensionChannel.ts:83](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/extension/browserExtensionChannel.ts#L83)

Sends a JSON-RPC request to the extension via `providerDetail.sendMessage`.
The response is validated as JSON-RPC before being dispatched.
Non-JSON-RPC responses are silently ignored.

#### Parameters

##### request

`JsonRpcRequest`

The JSON-RPC request to send to the extension.

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`Channel`](../../index/interfaces/Channel.md).[`send`](../../index/interfaces/Channel.md#send)
