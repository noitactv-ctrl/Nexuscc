import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema.js";

const { Pool } = pg;

const configuredDatabaseUrl =
  process.env.DATABASE_TRANSACTION_POOLER_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

function useSupabaseTransactionPooler(connectionString: string): string {
  let parsed: URL;
  try {
    parsed = new URL(connectionString);
  } catch {
    return connectionString;
  }
  const isSupabaseSessionPooler =
    parsed.hostname.endsWith(".pooler.supabase.com") && parsed.port === "5432";

  if (isSupabaseSessionPooler) {
    // Port 5432 is Supavisor session mode, whose server pool has a small
    // per-project client cap. Transaction mode multiplexes app connections.
    parsed.port = "6543";
    console.info("[db] Supabase transaction pooler enabled");
  }

  return parsed.toString();
}

const databaseUrl = configuredDatabaseUrl
  ? useSupabaseTransactionPooler(configuredDatabaseUrl)
  : undefined;

export function assertDatabaseConfigured() {
  if (!databaseUrl && !process.env.PGHOST) {
    throw new Error(
      "A PostgreSQL connection string or PGHOST binding is required. Set DATABASE_URL (or POSTGRES_URL_NON_POOLING/POSTGRES_URL in Vercel).",
    );
  }
}

const usesSupabaseHost = Boolean(databaseUrl && /(?:supabase\.co|pooler\.supabase\.com)/i.test(databaseUrl));

export const pool = new Pool(databaseUrl ? {
  connectionString: databaseUrl,
  ...(usesSupabaseHost ? { ssl: { rejectUnauthorized: false } } : {}),
  max: 1,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 10_000,
} : {});
export const db = drizzle(pool, { schema });
