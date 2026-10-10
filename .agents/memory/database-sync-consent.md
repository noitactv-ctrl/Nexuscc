---
name: Database sync consent
description: Scope of user consent for destructive schema pushes.
---

The user explicitly approved deleting the then-unmodeled populated tables and columns for the `DATABASE_URL` sync completed on 2026-10-10. This was a one-time approval, not standing permission for future destructive schema pushes.

**Why:** The push warning included existing session and Telegram data, and the user chose deletion only after seeing those consequences.

**How to apply:** For later schema pushes, review each data-loss warning and get fresh explicit approval before using `--force` or dropping populated data.
