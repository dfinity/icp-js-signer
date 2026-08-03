# Changelog

## Unreleased

### Fix

- bound a delegation chain's lifetime by its earliest hop (#49)

## 5.6.1 (2026-07-31)

### Fix

- **web**: re-validate the redirect URL at the sink and tighten secure-context (#35)
- validate the delegation chain a signer returns against the request (#34)
- **web**: apply origin/shape checks to every heartbeat status message (#33)
- **agent**: bind a per-call nonce in SignerAgent content-map verification (#36)
- **web**: guard the call-order replay journal with a content fingerprint (#37)

## 5.6.0 (2026-07-24)

### Feat

- **web**: harden the URL transport's redirect resume (#30)

## 5.5.0 (2026-07-23)

### Feat

- **web**: add ICRC-167 browser URL transport (#27)

## 5.4.0 (2026-05-22)

### Feat

- **signer**: allow toggling autoCloseTransportChannel at runtime (#21)

## 5.3.1 (2026-04-26)

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
