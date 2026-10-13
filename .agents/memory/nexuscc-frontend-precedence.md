---
name: OmniMarket frontend precedence
description: User's chosen policy for conflicts involving older UI or branding.
---

When reconciling older commits, keep the current OmniMarket frontend and honor the user's latest removals. Use OmniMarket as the current brand. Do not reintroduce the Ranks route/page, the “Providing high quality cards since 2026” hero copy, or navigation entries the user asked to remove.

**Why:** The user explicitly selected the current frontend as the source of truth during conflict resolution and has now chosen OmniMarket branding; older commits contain superseded UI and brand decisions.

**How to apply:** When resolving frontend conflicts, compare incoming changes against the current auth, cards, home, and sidebar requirements before accepting them.
