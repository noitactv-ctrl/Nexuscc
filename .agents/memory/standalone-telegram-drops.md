---
name: Standalone Telegram drops
description: Telegram drops operate independently from website accounts and must not require store linking.
---

Telegram drop eligibility, referral rewards, and bot administrator authorization are identified by Telegram chat ID. The bot must not generate or redeem website account-link tokens, and users must never need a linked store account to claim drops.

**Why:** The product was intentionally changed to make drops accessible directly through Telegram and to remove the security and support burden of cross-account linking.

**How to apply:** Keep drop state in the Telegram chat-member, claim, referral, and administrator records. Treat website accounts and their balances as separate from bot claims.

The admin text-file upload must explicitly cast its numeric creator ID to `integer` in the `SELECT DISTINCT` insert. PostgreSQL can otherwise infer the ID parameter as text alongside the drop text and reject the assignment with a datatype-mismatch error.

**Why:** The production-style upload path returned PostgreSQL error `42804` because the untyped creator parameter was inferred as text.

**How to apply:** When changing the drop upload insert or its selected columns, preserve the explicit integer cast and verify the statement against PostgreSQL.