---
title: HeartbeatClientOptions
editUrl: false
next: true
prev: true
---

Defined in: [src/web/heartbeat/client.ts:3](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/web/heartbeat/client.ts#L3)

## Properties

### crypto?

> `optional` **crypto?**: `Pick`\<`Crypto`, `"randomUUID"`\>

Defined in: [src/web/heartbeat/client.ts:57](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/web/heartbeat/client.ts#L57)

Get random uuid implementation for status messages

#### Default

```ts
globalThis.crypto;
```

---

### disconnectTimeout?

> `optional` **disconnectTimeout?**: `number`

Defined in: [src/web/heartbeat/client.ts:38](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/web/heartbeat/client.ts#L38)

Time in milliseconds of not receiving heartbeat responses after which the communication channel is disconnected

#### Default

```ts
5000;
```

---

### establishTimeout?

> `optional` **establishTimeout?**: `number`

Defined in: [src/web/heartbeat/client.ts:16](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/web/heartbeat/client.ts#L16)

Reasonable time in milliseconds in which the communication channel needs to be established

#### Default

```ts
10000;
```

---

### onDisconnect

> **onDisconnect**: () => `void`

Defined in: [src/web/heartbeat/client.ts:42](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/web/heartbeat/client.ts#L42)

Callback when no heartbeats have been received for `disconnectTimeout` milliseconds

#### Returns

`void`

---

### onEstablish

> **onEstablish**: (`origin`, `status`) => `void`

Defined in: [src/web/heartbeat/client.ts:11](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/web/heartbeat/client.ts#L11)

Callback when first heartbeat has been received

#### Parameters

##### origin

`string`

##### status

`"pending"` \| `"ready"`

#### Returns

`void`

---

### onEstablishTimeout

> **onEstablishTimeout**: () => `void`

Defined in: [src/web/heartbeat/client.ts:20](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/web/heartbeat/client.ts#L20)

Callback when no heartbeats have been received for `establishTimeout` milliseconds

#### Returns

`void`

---

### onPendingTimeout

> **onPendingTimeout**: () => `void`

Defined in: [src/web/heartbeat/client.ts:33](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/web/heartbeat/client.ts#L33)

Callback when no heartbeats have been received for `pendingTimeout` milliseconds

#### Returns

`void`

---

### onStatusChange

> **onStatusChange**: (`status`) => `void`

Defined in: [src/web/heartbeat/client.ts:24](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/web/heartbeat/client.ts#L24)

Callback when status response has changed

#### Parameters

##### status

`"pending"` \| `"ready"`

#### Returns

`void`

---

### pendingTimeout?

> `optional` **pendingTimeout?**: `number`

Defined in: [src/web/heartbeat/client.ts:29](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/web/heartbeat/client.ts#L29)

Reasonable time in milliseconds in which the communication channel can be pending

#### Default

```ts
300000;
```

---

### signerWindow

> **signerWindow**: `Window`

Defined in: [src/web/heartbeat/client.ts:7](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/web/heartbeat/client.ts#L7)

Signer window to send and receive heartbeat messages from

---

### statusPollingRate?

> `optional` **statusPollingRate?**: `number`

Defined in: [src/web/heartbeat/client.ts:47](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/web/heartbeat/client.ts#L47)

Status polling rate in ms

#### Default

```ts
300;
```

---

### window?

> `optional` **window?**: `Window`

Defined in: [src/web/heartbeat/client.ts:52](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/web/heartbeat/client.ts#L52)

Relying party window, used to listen for incoming message events

#### Default

```ts
globalThis.window;
```
