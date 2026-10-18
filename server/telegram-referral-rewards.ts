import { pool } from "./db.js";
import type { Pool } from "pg";

export const DAILY_REFERRAL_START_BONUS_CENTS = 100;

/**
 * Pay any newly-started referrals once the referrer has linked a site account.
 * A unique payout row plus a per-referrer transaction lock makes retries safe.
 */
export async function payPendingDailyReferralStartBonuses(
  referrerChatId: string,
  database: Pick<Pool, "connect"> = pool,
) {
  const client = await database.connect();
  let paidCount = 0;

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `daily-referral-start:${referrerChatId}`,
    ]);

    const pending = await client.query(
      `SELECT r.id AS referral_id, account.user_id AS referrer_user_id
       FROM telegram_daily_reward_referrals r
       JOIN telegram_daily_reward_accounts account ON account.chat_id = r.referrer_chat_id
       JOIN users u ON u.id = account.user_id AND u.is_banned = FALSE
       LEFT JOIN telegram_daily_referral_start_payouts p ON p.referral_id = r.id
       WHERE r.referrer_chat_id = $1
         AND r.start_bonus_eligible = TRUE
         AND p.referral_id IS NULL
       ORDER BY r.id
       FOR UPDATE OF r`,
      [referrerChatId],
    );

    for (const referral of pending.rows) {
      const payout = await client.query(
        `INSERT INTO telegram_daily_referral_start_payouts
           (referral_id, referrer_user_id, amount_cents)
         VALUES ($1, $2, $3)
         ON CONFLICT (referral_id) DO NOTHING
         RETURNING id`,
        [referral.referral_id, referral.referrer_user_id, DAILY_REFERRAL_START_BONUS_CENTS],
      );
      if (payout.rowCount === 0) continue;

      await client.query(
        "UPDATE users SET balance = balance + $1 WHERE id = $2",
        [DAILY_REFERRAL_START_BONUS_CENTS, referral.referrer_user_id],
      );
      await client.query(
        `INSERT INTO transactions (user_id, amount, type, description)
         VALUES ($1, $2, 'daily_referral_reward', 'One-time $1 reward for a new Telegram referral')`,
        [referral.referrer_user_id, DAILY_REFERRAL_START_BONUS_CENTS],
      );
      paidCount++;
    }

    await client.query("COMMIT");
    return paidCount;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
