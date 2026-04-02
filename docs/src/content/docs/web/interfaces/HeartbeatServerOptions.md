---
title: HeartbeatServerOptions
editUrl: false
next: true
prev: true
---

Defined in: [src/web/heartbeat/server.ts:3](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/web/heartbeat/server.ts#L3)

## Properties

### allowedOrigin?

> `optional` **allowedOrigin?**: `string` \| `null`

Defined in: [src/web/heartbeat/server.ts:12](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/web/heartbeat/server.ts#L12)

The allowed origin that the communication channel can be established with, recommended for secure re-establishment

---

### disconnectTimeout?

> `optional` **disconnectTimeout?**: `number`

Defined in: [src/web/heartbeat/server.ts:30](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/web/heartbeat/server.ts#L30)

Time in milliseconds of not receiving heartbeat requests after which the communication channel is disconnected

#### Default

```ts
2000;
```

---

### establishTimeout?

> `optional` **establishTimeout?**: `number`

Defined in: [src/web/heartbeat/server.ts:21](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/web/heartbeat/server.ts#L21)

Reasonable time in milliseconds in which the communication channel needs to be established

#### Default

```ts
10000;
```

---

### onDisconnect

> **onDisconnect**: () => `void`

Defined in: [src/web/heartbeat/server.ts:34](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/web/heartbeat/server.ts#L34)

Callback when no heartbeats have been received for `disconnectTimeout` milliseconds

#### Returns

`void`

---

### onEstablish

> **onEstablish**: (`origin`, `source`) => `void`

Defined in: [src/web/heartbeat/server.ts:16](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/web/heartbeat/server.ts#L16)

Callback when first heartbeat has been received

#### Parameters

##### origin

`string`

##### source

`Window`

#### Returns

`void`

---

### onEstablishTimeout

> **onEstablishTimeout**: () => `void`

Defined in: [src/web/heartbeat/server.ts:25](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/web/heartbeat/server.ts#L25)

Callback when no heartbeats have been received for `establishTimeout` milliseconds

#### Returns

`void`

---

### status?

> `optional` **status?**: `"pending"` \| `"ready"`

Defined in: [src/web/heartbeat/server.ts:8](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/web/heartbeat/server.ts#L8)

The initial server status to return to the client

#### Default

```ts
'ready';
```

---

### window?

> `optional` **window?**: `Window`

Defined in: [src/web/heartbeat/server.ts:39](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/web/heartbeat/server.ts#L39)

Signer window, used to listen for incoming message events

#### Default

```ts
globalThis.window;
```
