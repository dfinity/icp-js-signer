---
title: PermissionState
editUrl: false
next: true
prev: true
---

> **PermissionState** = `"denied"` \| `"ask_on_use"` \| `"granted"`

Defined in: [src/signer.ts:96](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/signer.ts#L96)

The state of a permission scope as reported by the signer.

- `granted` — the relying party may call the method without further approval.
- `denied` — the signer will reject calls to the method.
- `ask_on_use` — the signer will prompt the user when the method is called.
