---
title: SignerRequestTransformFn
editUrl: false
next: true
prev: true
---

> **SignerRequestTransformFn** = (`request`) => `JsonRpcRequest`

Defined in: [src/signer.ts:55](https://github.com/dfinity/icp-js-signer/blob/bc1592044d269bf4f011f0f9d3a0f0cb39ff5833/src/signer.ts#L55)

A function that transforms a JSON-RPC request before it is sent to the signer.
Transforms are applied in order and each receives the output of the previous one.

## Parameters

### request

`JsonRpcRequest`

## Returns

`JsonRpcRequest`
