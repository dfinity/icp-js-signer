---
title: PostMessageChannel
editUrl: false
next: true
prev: true
---

Defined in: [src/web/postMessageChannel.ts:42](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/web/postMessageChannel.ts#L42)

A [Channel](../../index/interfaces/Channel.md) implementation that communicates with a signer
via `window.postMessage`. Created by [PostMessageTransport](PostMessageTransport.md)
after the ICRC-29 heartbeat handshake completes.

Messages are filtered by source window and origin to prevent
cross-origin interference. When the signer status is `"pending"`,
outgoing messages are queued and flushed when it becomes `"ready"`.

## Implements

- [`Channel`](../../index/interfaces/Channel.md)

## Constructors

### Constructor

> **new PostMessageChannel**(`options`): `PostMessageChannel`

Defined in: [src/web/postMessageChannel.ts:48](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/web/postMessageChannel.ts#L48)

#### Parameters

##### options

[`PostMessageChannelOptions`](../interfaces/PostMessageChannelOptions.md)

#### Returns

`PostMessageChannel`

## Accessors

### closed

#### Get Signature

> **get** **closed**(): `boolean`

Defined in: [src/web/postMessageChannel.ts:58](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/web/postMessageChannel.ts#L58)

Whether this channel has been closed.

##### Returns

`boolean`

#### Implementation of

[`Channel`](../../index/interfaces/Channel.md).[`closed`](../../index/interfaces/Channel.md#closed)

## Methods

### addEventListener()

> **addEventListener**(...`__namedParameters`): () => `void`

Defined in: [src/web/postMessageChannel.ts:62](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/web/postMessageChannel.ts#L62)

#### Parameters

##### \_\_namedParameters

\[`"close"`, () => `void`\] \| \[`"response"`, (`response`) => `void`\]

#### Returns

() => `void`

#### Implementation of

[`Channel`](../../index/interfaces/Channel.md).[`addEventListener`](../../index/interfaces/Channel.md#addeventlistener)

---

### changeStatus()

> **changeStatus**(`status`): `void`

Defined in: [src/web/postMessageChannel.ts:145](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/web/postMessageChannel.ts#L145)

Updates the signer status. When transitioning to `"ready"`,
all queued messages are flushed to the signer window.

#### Parameters

##### status

`"pending"` \| `"ready"`

The new signer status.

#### Returns

`void`

---

### close()

> **close**(): `Promise`\<`void`\>

Defined in: [src/web/postMessageChannel.ts:122](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/web/postMessageChannel.ts#L122)

Closes the signer window and notifies all close listeners.

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`Channel`](../../index/interfaces/Channel.md).[`close`](../../index/interfaces/Channel.md#close)

---

### send()

> **send**(`request`): `Promise`\<`void`\>

Defined in: [src/web/postMessageChannel.ts:99](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/web/postMessageChannel.ts#L99)

Sends a JSON-RPC request to the signer. If the signer status is
`"pending"`, the request is queued until [changeStatus](#changestatus) is
called with `"ready"`.

#### Parameters

##### request

`JsonRpcRequest`

The JSON-RPC request to send.

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`Channel`](../../index/interfaces/Channel.md).[`send`](../../index/interfaces/Channel.md#send)
