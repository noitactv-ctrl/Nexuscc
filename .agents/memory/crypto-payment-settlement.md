---
name: Crypto payment settlement
description: Rules for safely confirming and crediting blockchain-backed payments.
---

Blockchain payment providers can deliver the same confirmation through a webhook, a polling worker, and a client status request. Settlement must be idempotent, authenticated, and retryable if a payment reaches completed status before its balance or order update finishes.

For an in-app payment-instructions page, create a provider payment for the buyer-selected currency and persist the provider-returned address, amount, network, memo, and expiry. A hosted invoice URL does not supply enough data for a genuine address/QR page; never substitute sample payment details.

**Why:** Payment confirmation is a retry-prone distributed workflow; marking a payment complete before its business-side credit can otherwise lose funds, while processing callbacks independently can double-credit.

**How to apply:** Keep signed webhook verification and provider polling as complementary paths, lock the payment row while settling, record a payment-specific settlement marker, and include completed-but-unsettled rows in retry scans. For direct crypto instructions, render only values returned by the selected provider payment.