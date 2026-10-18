---
name: Supabase runtime connection
description: The difference between the agent's Supabase MCP access and the app's direct PostgreSQL runtime connection.
---

The Supabase MCP connection is for agent-side inspection and SQL operations; it does not automatically replace the app's runtime PostgreSQL connection. This app uses Drizzle with `pg`. For Supabase runtime connections, prefer the transaction pooler: Supavisor session mode (`.pooler.supabase.com:5432`) has a small per-project session cap, while transaction mode multiplexes clients. The app automatically switches recognized session-pooler URLs to port 6543 and keeps its local pool bounded.

**Why:** Concurrent app processes exhausted Supabase's 15-client session pool, preventing server startup. An unbounded application pool would worsen that limit, not remove it.

**How to apply:** Keep Supabase app traffic on transaction pooling where supported; do not raise the local pool to an unbounded size. Direct Supabase hosts and Replit `PG*` bindings are left unchanged.