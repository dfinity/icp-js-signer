---
title: PostMessageChannel
editUrl: false
next: true
prev: true
---

Defined in: [src/web/postMessageChannel.ts:42](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/web/postMessageChannel.ts#L42)

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

Defined in: [src/web/postMessageChannel.ts:48](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/web/postMessageChannel.ts#L48)

#### Parameters

##### options

[`PostMessageChannelOptions`](../interfaces/PostMessageChannelOptions.md)

#### Returns

`PostMessageChannel`

## Accessors

### closed

#### Get Signature

> **get** **closed**(): `boolean`

Defined in: [src/web/postMessageChannel.ts:58](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/web/postMessageChannel.ts#L58)

Whether this channel has been closed.

##### Returns

`boolean`

#### Implementation of

[`Channel`](../../index/interfaces/Channel.md).[`closed`](../../index/interfaces/Channel.md#closed)

## Methods

### addEventListener()

> **addEventListener**(...`__namedParameters`): () => `void`

Defined in: [src/web/postMessageChannel.ts:62](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/web/postMessageChannel.ts#L62)

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

Defined in: [src/web/postMessageChannel.ts:135](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/web/postMessageChannel.ts#L135)

Updates the signer status. When transitioning to `"ready"`,
all queued messages are flushed to the signer window.

#### Parameters

##### status

`"pending"` \| `"ready"`

#### Returns

`void`

---

### close()

> **close**(): `Promise`\<`void`\>

Defined in: [src/web/postMessageChannel.ts:116](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/web/postMessageChannel.ts#L116)

Closes the signer window and notifies all close listeners.

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`Channel`](../../index/interfaces/Channel.md).[`close`](../../index/interfaces/Channel.md#close)

---

### send()

> **send**(`request`): `Promise`\<`void`\>

Defined in: [src/web/postMessageChannel.ts:98](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/web/postMessageChannel.ts#L98)

Sends a JSON-RPC request to the signer. If the signer status is
`"pending"`, the request is queued until [changeStatus](#changestatus) is
called with `"ready"`.

#### Parameters

##### request

`JsonRpcRequest`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`Channel`](../../index/interfaces/Channel.md).[`send`](../../index/interfaces/Channel.md#send)
