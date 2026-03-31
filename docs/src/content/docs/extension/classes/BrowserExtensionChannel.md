---
title: BrowserExtensionChannel
editUrl: false
next: true
prev: true
---

Defined in: [src/extension/browserExtensionChannel.ts:30](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/extension/browserExtensionChannel.ts#L30)

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

Defined in: [src/extension/browserExtensionChannel.ts:36](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/extension/browserExtensionChannel.ts#L36)

#### Parameters

##### options

[`BrowserExtensionChannelOptions`](../interfaces/BrowserExtensionChannelOptions.md)

#### Returns

`BrowserExtensionChannel`

## Accessors

### closed

#### Get Signature

> **get** **closed**(): `boolean`

Defined in: [src/extension/browserExtensionChannel.ts:52](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/extension/browserExtensionChannel.ts#L52)

Whether this channel has been closed.

##### Returns

`boolean`

#### Implementation of

[`Channel`](../../index/interfaces/Channel.md).[`closed`](../../index/interfaces/Channel.md#closed)

## Methods

### addEventListener()

> **addEventListener**(...`__namedParameters`): () => `void`

Defined in: [src/extension/browserExtensionChannel.ts:56](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/extension/browserExtensionChannel.ts#L56)

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

Defined in: [src/extension/browserExtensionChannel.ts:93](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/extension/browserExtensionChannel.ts#L93)

Dismisses the extension and notifies all close listeners.

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`Channel`](../../index/interfaces/Channel.md).[`close`](../../index/interfaces/Channel.md#close)

---

### send()

> **send**(`request`): `Promise`\<`void`\>

Defined in: [src/extension/browserExtensionChannel.ts:80](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/extension/browserExtensionChannel.ts#L80)

Sends a JSON-RPC request to the extension via `providerDetail.sendMessage`.
The response is validated as JSON-RPC before being dispatched.
Non-JSON-RPC responses are silently ignored.

#### Parameters

##### request

`JsonRpcRequest`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`Channel`](../../index/interfaces/Channel.md).[`send`](../../index/interfaces/Channel.md#send)
