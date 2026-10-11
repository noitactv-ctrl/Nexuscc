---
name: GitHub push authentication
description: Handling GitHub remote authentication failures when the Replit integration appears authorized.
---

When a Git push is rejected for invalid credentials, a Replit GitHub connection can appear healthy or report that it is already added while the workspace Git remote still rejects authentication. Do not ask for a personal access token in chat, repeatedly retry `git push`, or treat an “already added” response as proof that pushes work. After a bounded check of the connection and remote, stop and have the user reconnect GitHub through Replit's secure integration or source-control flow.

**Why:** The workspace remote rejected an authorized push even after the integration reported success, and the reauthorization flow could not attach to that connection.

**How to apply:** Verify branch status and committed work first; if GitHub rejects the push, use only supported OAuth recovery. If that flow is unavailable or fails, leave commits local and explain how the user can reconnect securely.
