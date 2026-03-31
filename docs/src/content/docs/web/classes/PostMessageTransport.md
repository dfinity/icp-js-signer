---
title: PostMessageTransport
editUrl: false
next: true
prev: true
---

Defined in: [src/web/postMessageTransport.ts:101](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/web/postMessageTransport.ts#L101)

ICRC-29 post message transport for communicating with web-based signers.

Opens a window to the signer's URL and establishes a communication channel
using the ICRC-29 heartbeat protocol (`icrc29_status` polling). Messages
are exchanged via `window.postMessage`.

## See

https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_29_window_post_message_transport.md

## Example

```ts
const transport = new PostMessageTransport({ url: 'https://oisy.com/sign' });
const signer = new Signer({ transport });
```

## Implements

- [`Transport`](../../index/interfaces/Transport.md)

## Constructors

### Constructor

> **new PostMessageTransport**(`options`): `PostMessageTransport`

Defined in: [src/web/postMessageTransport.ts:104](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/web/postMessageTransport.ts#L104)

#### Parameters

##### options

[`PostMessageTransportOptions`](../interfaces/PostMessageTransportOptions.md)

#### Returns

`PostMessageTransport`

## Methods

### establishChannel()

> **establishChannel**(): `Promise`\<[`PostMessageChannel`](PostMessageChannel.md)\>

Defined in: [src/web/postMessageTransport.ts:145](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/web/postMessageTransport.ts#L145)

Opens the signer window and establishes a communication channel
via the ICRC-29 heartbeat handshake.

#### Returns

`Promise`\<[`PostMessageChannel`](PostMessageChannel.md)\>

#### Throws

If called outside a click handler
(when `detectNonClickEstablishment` is enabled), if the window
cannot be opened, or if the handshake times out.

#### Implementation of

[`Transport`](../../index/interfaces/Transport.md).[`establishChannel`](../../index/interfaces/Transport.md#establishchannel)
