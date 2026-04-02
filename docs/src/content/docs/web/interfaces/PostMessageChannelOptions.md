---
title: PostMessageChannelOptions
editUrl: false
next: true
prev: true
---

Defined in: [src/web/postMessageChannel.ts:10](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/web/postMessageChannel.ts#L10)

Options for creating a [PostMessageChannel](../classes/PostMessageChannel.md).

## Properties

### manageFocus?

> `optional` **manageFocus?**: `boolean`

Defined in: [src/web/postMessageChannel.ts:30](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/web/postMessageChannel.ts#L30)

Manage focus between the relying party and signer windows.

#### Default

```ts
true;
```

---

### signerOrigin

> **signerOrigin**: `string`

Defined in: [src/web/postMessageChannel.ts:14](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/web/postMessageChannel.ts#L14)

The verified origin of the signer window.

---

### signerStatus?

> `optional` **signerStatus?**: `"pending"` \| `"ready"`

Defined in: [src/web/postMessageChannel.ts:20](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/web/postMessageChannel.ts#L20)

Initial status of the signer. When `"pending"`, messages are queued
until the status changes to `"ready"`.

#### Default

```ts
'ready';
```

---

### signerWindow

> **signerWindow**: `Window`

Defined in: [src/web/postMessageChannel.ts:12](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/web/postMessageChannel.ts#L12)

The signer window that this channel communicates with.

---

### window?

> `optional` **window?**: `Window`

Defined in: [src/web/postMessageChannel.ts:25](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/web/postMessageChannel.ts#L25)

The relying party window, used to listen for incoming `postMessage` events.

#### Default

```ts
globalThis.window;
```
