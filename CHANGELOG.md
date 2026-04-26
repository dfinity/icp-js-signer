# Changelog

## Unreleased

### Fix

- only auto-close transport channel when no pending requests (#17)

## 5.3.0 (2026-04-08)

### Feat

- Add configurable request transform pipeline to `Signer`
- Export `SignerRequestTransformFn` type for authoring custom transforms

### Fix

- Strip `undefined` properties from JSON-RPC requests before sending

## v5.2.0 (2026-03-31)

### Feat

- Initial release of @icp-sdk/signer
- Core Signer class with ICRC-25/27/34/49 support
- SignerAgent as drop-in HttpAgent replacement
- ICRC-29 PostMessage transport for web signers
- ICRC-94 transport for browser extension signers
