import { pool } from "./db.js";

export const TELEGRAM_GROUP_ID =
  process.env.TELEGRAM_GROUP_ID || process.env.Telegram_group_id || "";

export const TELEGRAM_JOIN_URL =
  process.env.TELEGRAM_JOIN_URL || "https://t.me/+uh_mmVGlIZFjM2Ux";

/**
 * Idempotent Telegram referral/drop tables for the web app and standalone bot.
 */
export async function ensureTelegramReferralSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_chat_members (
      chat_id TEXT PRIMARY KEY,
      telegram_username TEXT,
      name_active BOOLEAN NOT NULL DEFAULT FALSE,
      pending_referrer_chat_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    ALTER TABLE telegram_chat_members
    ADD COLUMN IF NOT EXISTS pending_referrer_chat_id TEXT
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_chat_referrals (
      id BIGSERIAL PRIMARY KEY,
      referrer_chat_id TEXT NOT NULL,
      referred_chat_id TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_chat_referral_bonuses (
      id BIGSERIAL PRIMARY KEY,
      referrer_chat_id TEXT NOT NULL,
      referral_id BIGINT NOT NULL UNIQUE REFERENCES telegram_chat_referrals(id),
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_daily_reward_accounts (
      chat_id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_daily_reward_link_codes (
      code_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_daily_reward_claims (
      id BIGSERIAL PRIMARY KEY,
      chat_id TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reward_date DATE NOT NULL DEFAULT CURRENT_DATE,
      amount_cents INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(chat_id, reward_date)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_daily_reward_referrals (
      id BIGSERIAL PRIMARY KEY,
      referrer_chat_id TEXT NOT NULL,
      referred_chat_id TEXT NOT NULL UNIQUE,
      start_bonus_eligible BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (referrer_chat_id <> referred_chat_id)
    )
  `);
  await pool.query(`
    ALTER TABLE telegram_daily_reward_referrals
    ADD COLUMN IF NOT EXISTS start_bonus_eligible BOOLEAN NOT NULL DEFAULT FALSE
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_daily_referral_payouts (
      id BIGSERIAL PRIMARY KEY,
      referral_id BIGINT NOT NULL REFERENCES telegram_daily_reward_referrals(id) ON DELETE CASCADE,
      reward_date DATE NOT NULL DEFAULT CURRENT_DATE,
      referrer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      referred_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount_cents INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(referral_id, reward_date)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_daily_referral_start_payouts (
      id BIGSERIAL PRIMARY KEY,
      referral_id BIGINT NOT NULL UNIQUE REFERENCES telegram_daily_reward_referrals(id) ON DELETE CASCADE,
      referrer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount_cents INTEGER NOT NULL CHECK (amount_cents = 100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}