---
title: PostMessageTransportOptions
editUrl: false
next: true
prev: true
---

Defined in: [src/web/postMessageTransport.ts:12](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/web/postMessageTransport.ts#L12)

Options for creating a [PostMessageTransport](../classes/PostMessageTransport.md).

## Properties

### closeOnEstablishTimeout?

> `optional` **closeOnEstablishTimeout?**: `boolean`

Defined in: [src/web/postMessageTransport.ts:63](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/web/postMessageTransport.ts#L63)

Close the signer window if the heartbeat handshake times out.

#### Default

```ts
true;
```

---

### closeOnPendingTimeout?

> `optional` **closeOnPendingTimeout?**: `boolean`

Defined in: [src/web/postMessageTransport.ts:68](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/web/postMessageTransport.ts#L68)

Close the signer window if it stays in "pending" status too long.

#### Default

```ts
true;
```

---

### crypto?

> `optional` **crypto?**: `Pick`\<`Crypto`, `"randomUUID"`\>

Defined in: [src/web/postMessageTransport.ts:51](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/web/postMessageTransport.ts#L51)

Source of random UUIDs for heartbeat request IDs.

#### Default

```ts
globalThis.crypto;
```

---

### detectNonClickEstablishment?

> `optional` **detectNonClickEstablishment?**: `boolean`

Defined in: [src/web/postMessageTransport.ts:75](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/web/postMessageTransport.ts#L75)

Detect and reject attempts to open the signer window outside a
click handler. Browsers like Safari block popups opened without
user interaction.

#### Default

```ts
true;
```

---

### disconnectTimeout?

> `optional` **disconnectTimeout?**: `number`

Defined in: [src/web/postMessageTransport.ts:41](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/web/postMessageTransport.ts#L41)

Time in milliseconds without a heartbeat response after which
the channel is considered disconnected.

#### Default

```ts
2000;
```

---

### establishTimeout?

> `optional` **establishTimeout?**: `number`

Defined in: [src/web/postMessageTransport.ts:29](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/web/postMessageTransport.ts#L29)

Time in milliseconds to wait for the ICRC-29 heartbeat handshake to complete.

#### Default

```ts
120000;
```

---

### manageFocus?

> `optional` **manageFocus?**: `boolean`

Defined in: [src/web/postMessageTransport.ts:58](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/web/postMessageTransport.ts#L58)

Manage focus between the relying party and signer windows.
When true, the signer window is focused on send and the relying
party window is focused on close.

#### Default

```ts
true;
```

---

### pendingTimeout?

> `optional` **pendingTimeout?**: `number`

Defined in: [src/web/postMessageTransport.ts:35](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/web/postMessageTransport.ts#L35)

Time in milliseconds the channel can remain in "pending" status
before the connection is considered failed.

#### Default

```ts
300000;
```

---

### statusPollingRate?

> `optional` **statusPollingRate?**: `number`

Defined in: [src/web/postMessageTransport.ts:46](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/web/postMessageTransport.ts#L46)

Interval in milliseconds between ICRC-29 heartbeat status polls.

#### Default

```ts
300;
```

---

### url

> **url**: `string`

Defined in: [src/web/postMessageTransport.ts:14](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/web/postMessageTransport.ts#L14)

The signer's RPC URL. Must be a secure context (HTTPS, localhost, or 127.0.0.1).

---

### window?

> `optional` **window?**: `Window`

Defined in: [src/web/postMessageTransport.ts:24](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/web/postMessageTransport.ts#L24)

The relying party window, used to listen for incoming `postMessage` events.

#### Default

```ts
globalThis.window;
```

---

### windowOpenerFeatures?

> `optional` **windowOpenerFeatures?**: `string`

Defined in: [src/web/postMessageTransport.ts:19](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/web/postMessageTransport.ts#L19)

Window features string passed to `window.open()`.

#### Example

```ts
'toolbar=0,location=0,menubar=0,width=500,height=500,left=100,top=100';
```
