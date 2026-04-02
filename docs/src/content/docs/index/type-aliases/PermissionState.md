---
title: PermissionState
editUrl: false
next: true
prev: true
---

> **PermissionState** = `"denied"` \| `"ask_on_use"` \| `"granted"`

Defined in: [src/signer.ts:64](https://github.com/dfinity/icp-js-signer/blob/fb52342d12dece5ff1354c346aa4faf01d6b61ee/src/signer.ts#L64)

The state of a permission scope as reported by the signer.

- `granted` — the relying party may call the method without further approval.
- `denied` — the signer will reject calls to the method.
- `ask_on_use` — the signer will prompt the user when the method is called.
