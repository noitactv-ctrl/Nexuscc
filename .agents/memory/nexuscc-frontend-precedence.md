---
name: NexusCC frontend precedence
description: User's chosen policy for conflicts involving older UI or branding.
---

When reconciling older commits, keep the current NexusCC frontend and honor the user's latest removals. Do not reintroduce the Ranks route/page, the “Providing high quality cards since 2026” hero copy, or navigation entries the user asked to remove.

**Why:** The user explicitly selected the current NexusCC frontend as the source of truth during conflict resolution; older commits contain UI decisions they have since superseded.

**How to apply:** When resolving frontend conflicts, compare incoming changes against the current auth, cards, home, and sidebar requirements before accepting them.
