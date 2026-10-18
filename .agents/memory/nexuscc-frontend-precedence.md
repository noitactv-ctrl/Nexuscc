---
name: OmniMarket frontend precedence
description: User's chosen policy for conflicts involving older UI or branding.
---

When reconciling older commits, keep the current OmniMarket frontend and honor the user's latest UI decisions. Use OmniMarket as the current brand. The Ranks page is active again; keep it available when its feature flag is enabled. Do not reintroduce the “Providing high quality cards since 2026” hero copy or navigation entries the user asked to remove.

**Why:** The user selected the current frontend as the source of truth and has since explicitly requested that the Ranks page be restored; older commits may contain superseded UI decisions.

**How to apply:** When resolving frontend conflicts, compare incoming changes against the current auth, cards, home, and sidebar requirements before accepting them.
