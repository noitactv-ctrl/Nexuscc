---
name: Review approval credits
description: Store-credit policy for approved product reviews.
---

Grant $0.50 in store credit when a review is newly approved. Do not grant credits retroactively for reviews that were already approved before this policy took effect.

**Why:** The user confirmed that the reward should apply to future approvals only.

**How to apply:** Keep reward issuance atomic and idempotent with review approval; historical approvals remain uncredited unless the user explicitly changes this policy.
