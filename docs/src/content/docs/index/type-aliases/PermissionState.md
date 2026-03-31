---
title: PermissionState
editUrl: false
next: true
prev: true
---

> **PermissionState** = `"denied"` \| `"ask_on_use"` \| `"granted"`

Defined in: [src/signer.ts:65](https://github.com/dfinity/icp-js-signer/blob/a5db4fd7878bef2468bd688a478dc0e666ff45e9/src/signer.ts#L65)

The state of a permission scope as reported by the signer.

- `granted` — the relying party may call the method without further approval.
- `denied` — the signer will reject calls to the method.
- `ask_on_use` — the signer will prompt the user when the method is called.
