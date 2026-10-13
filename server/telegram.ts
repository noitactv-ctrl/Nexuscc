import { Bot, InlineKeyboard, type Context } from "grammy";
import { createHash } from "crypto";
import { pool } from "./db.js";
import { log } from "./logger.js";
import { CLAIM_LIMIT_PER_WINDOW, getClaimAccess } from "./reward-claim-policy.js";
import { MAX_LICENSE_FILE_BYTES, parseLicenseKeyFile } from "./license-key-file.js";
import { hasRequiredTelegramName, TELEGRAM_NAME_KEYWORD as NAME_KEYWORD } from "./telegram-name-policy.js";
import { ensureTelegramReferralSchema } from "./telegram-referrals.js";

const BROADCAST_MAX_CHARS = 1_000;
const BROADCAST_MAX_RECIPIENTS = 500;
const BROADCAST_COOLDOWN_MS = 60_000;
let lastBroadcastAt = 0;

const MD = { parse_mode: "Markdown" as const };

function getTelegramToken() {
  return process.env.TELEGRAM_BOT_TOKEN ?? process.env.BOT_TOKEN;
}

function getGroupId() {
  return process.env.TELEGRAM_GROUP_ID ?? process.env.Telegram_group_id ?? "";
}

function getJoinUrl() {
  return process.env.TELEGRAM_JOIN_URL ?? "https://t.me/+3-lMkt-idutkOTIx";
}

function getDailyJoinUrl() {
  return process.env.DAILY_REWARDS_JOIN_URL ?? "";
}

function getDailyChannelId() {
  return process.env.DAILY_REWARDS_CHANNEL_ID ?? "";
}

function getAdminIds() {
  return new Set(
    (process.env.TELEGRAM_ADMIN_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

function getMatch(ctx: Context) {
  return (typeof ctx.match === "string" ? ctx.match : ctx.match?.[0] ?? "").trim();
}

function getChatId(ctx: Context) {
  return String(ctx.from?.id ?? ctx.chat?.id ?? "");
}

function hasKeyword(ctx: Context) {
  return hasRequiredTelegramName(ctx.from?.first_name, ctx.from?.last_name);
}

function botKeyboard() {
  return new InlineKeyboard()
    .text("💸 Daily reward", "daily_reward")
    .text("🔗 Daily referrals", "daily_referrals")
    .row()
    .text("🎁 Claim free credit", "claim_reward")
    .text("👤 Credit status", "account_status")
    .row()
    .url("📣 Join our channel", getDailyJoinUrl() || getJoinUrl());
}

async function dailyGate(ctx: Context, bot: Bot) {
  const channelId = getDailyChannelId();
  const joinUrl = getDailyJoinUrl();
  const userId = ctx.from?.id;
  if (!channelId || !userId) {
    await ctx.reply("Daily rewards are not configured yet. Please try again later.");
    return false;
  }
  try {
    const member = await bot.api.getChatMember(channelId, userId);
    const joined = member.status === "creator" || member.status === "administrator" ||
      member.status === "member" || (member.status === "restricted" && member.is_member);
    if (joined) return true;
  } catch (error: any) {
    console.error("[telegram] daily rewards membership check failed:", error?.message ?? error);
  }
  const keyboard = new InlineKeyboard();
  if (joinUrl) keyboard.url("📣 Join the channel", joinUrl).row();
  keyboard.text("✅ I've joined — check again", "daily_check_join");
  await ctx.reply("🔒 Join the OmniMarket channel before using daily rewards, then tap the button below to verify.", { reply_markup: keyboard });
  return false;
}

async function linkDailyRewards(ctx: Context, bot: Bot) {
  if (ctx.chat?.type !== "private") {
    await ctx.reply("For account security, link your OmniMarket account with the bot in a private chat.");
    return;
  }
  if (!(await dailyGate(ctx, bot))) return;
  if (!hasKeyword(ctx)) {
    await ctx.reply(`Add ${NAME_KEYWORD} to your first or last name before linking your account.`);
    return;
  }
  const code = getMatch(ctx).replace(/\s+/g, "").toUpperCase();
  if (!/^[A-F0-9]{10}$/.test(code)) {
    await ctx.reply("Use the one-time code from your OmniMarket profile: /link CODE");
    return;
  }
  const codeHash = createHash("sha256").update(code).digest("hex");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`daily-link:${ctx.from!.id}`]);
    const result = await client.query(
      `SELECT user_id FROM telegram_daily_reward_link_codes
       WHERE code_hash = $1 AND consumed_at IS NULL AND expires_at > NOW() FOR UPDATE`,
      [codeHash],
    );
    const userId = result.rows[0]?.user_id;
    if (!userId) {
      await client.query("ROLLBACK");
      await ctx.reply("That code is invalid or expired. Generate a new one in your OmniMarket profile.");
      return;
    }
    const alreadyLinked = await client.query(
      `SELECT 1 FROM telegram_daily_reward_accounts
       WHERE chat_id = $1 OR user_id = $2 LIMIT 1`,
      [String(ctx.from!.id), userId],
    );
    if (alreadyLinked.rows[0]) {
      await client.query("ROLLBACK");
      await ctx.reply("This Telegram account or OmniMarket account is already linked.");
      return;
    }
    await client.query(
      `INSERT INTO telegram_daily_reward_accounts (chat_id, user_id) VALUES ($1, $2)`,
      [String(ctx.from!.id), userId],
    );
    await client.query(
      `UPDATE telegram_daily_reward_link_codes SET consumed_at = NOW() WHERE code_hash = $1`,
      [codeHash],
    );
    await client.query("COMMIT");
    await ctx.reply("✅ Your OmniMarket account is securely linked. Eligible rewards are credited automatically each day.");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("[telegram] daily rewards account linking failed:", error);
    await ctx.reply("Could not link your account right now. Please generate a new code and try again.");
  } finally {
    client.release();
  }
}

async function grantDailyReward(chatId: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`daily-reward:${chatId}`]);
    const account = await client.query(
      `SELECT a.user_id, u.is_banned
       FROM telegram_daily_reward_accounts a JOIN users u ON u.id = a.user_id
       WHERE a.chat_id = $1 FOR UPDATE OF a`,
      [chatId],
    );
    const userId = account.rows[0]?.user_id;
    if (!userId) {
      await client.query("ROLLBACK");
      return { status: "unlinked" as const };
    }
    if (account.rows[0].is_banned) {
      await client.query("ROLLBACK");
      return { status: "ineligible" as const };
    }
    const previous = await client.query(
      `SELECT amount_cents FROM telegram_daily_reward_claims
       WHERE chat_id = $1 AND reward_date = CURRENT_DATE`,
      [chatId],
    );
    if (previous.rows[0]) {
      await client.query("ROLLBACK");
      return { status: "already_paid" as const, amountCents: Number(previous.rows[0].amount_cents) };
    }
    const referral = await client.query(
      `SELECT r.id
       FROM telegram_daily_reward_referrals r
       JOIN telegram_daily_reward_accounts referrer ON referrer.chat_id = r.referrer_chat_id
       WHERE r.referred_chat_id = $1`,
      [chatId],
    );
    const amountCents = 25 + (referral.rows[0] ? 10 : 0);
    await client.query(
      `INSERT INTO telegram_daily_reward_claims (chat_id, user_id, amount_cents)
       VALUES ($1, $2, $3)`,
      [chatId, userId, amountCents],
    );
    await client.query(`UPDATE users SET balance = balance + $1 WHERE id = $2`, [amountCents, userId]);
    await client.query(
      `INSERT INTO transactions (user_id, amount, type, description)
       VALUES ($1, $2, 'daily_reward', 'Telegram daily reward')`,
      [userId, amountCents],
    );
    const referralPayouts = await client.query(
      `INSERT INTO telegram_daily_referral_payouts
         (referral_id, reward_date, referrer_user_id, referred_user_id, amount_cents)
       SELECT r.id, CURRENT_DATE, referrer.user_id, $2, 10
       FROM telegram_daily_reward_referrals r
       JOIN telegram_daily_reward_accounts referrer ON referrer.chat_id = r.referrer_chat_id
       JOIN users referrer_user ON referrer_user.id = referrer.user_id AND referrer_user.is_banned = FALSE
       WHERE r.referred_chat_id = $1
       ON CONFLICT (referral_id, reward_date) DO NOTHING
       RETURNING referrer_user_id`,
      [chatId, userId],
    );
    for (const payout of referralPayouts.rows) {
      await client.query(`UPDATE users SET balance = balance + 10 WHERE id = $1`, [payout.referrer_user_id]);
      await client.query(
        `INSERT INTO transactions (user_id, amount, type, description)
         VALUES ($1, 10, 'daily_referral_reward', 'Daily reward from an active referral')`,
        [payout.referrer_user_id],
      );
    }
    await client.query("COMMIT");
    return { status: "paid" as const, amountCents, referrerCount: referralPayouts.rowCount ?? 0 };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

function isDailyGateMember(status: string, isMember?: boolean) {
  return status === "creator" || status === "administrator" || status === "member" ||
    (status === "restricted" && isMember === true);
}

export async function runDailyRewardSweep(bot: Bot) {
  const lockClient = await pool.connect();
  let lockAcquired = false;
  try {
    const lock = await lockClient.query(
      "SELECT pg_try_advisory_lock(hashtext($1)) AS locked",
      ["nexuscc-daily-reward-sweep"],
    );
    lockAcquired = Boolean(lock.rows[0]?.locked);
    if (!lockAcquired) return;
    await ensureTelegramReferralSchema();
    const channelId = getDailyChannelId();
    if (!channelId) {
      console.error("[telegram] daily reward sweep skipped: channel ID is not configured");
      return;
    }
    const candidates = await pool.query(
      `SELECT a.chat_id
       FROM telegram_daily_reward_accounts a
       JOIN users u ON u.id = a.user_id AND u.is_banned = FALSE
       LEFT JOIN telegram_daily_reward_claims c
         ON c.chat_id = a.chat_id AND c.reward_date = CURRENT_DATE
       WHERE c.id IS NULL
       ORDER BY a.linked_at`,
    );
    for (const candidate of candidates.rows) {
      const chatId = String(candidate.chat_id);
      try {
        const member = await bot.api.getChatMember(channelId, Number(chatId));
        if (!isDailyGateMember(member.status, member.status === "restricted" ? member.is_member : undefined)) continue;
        if (!hasRequiredTelegramName(member.user.first_name, member.user.last_name)) continue;
        const result = await grantDailyReward(chatId);
        if (result.status === "paid") {
          await bot.api.sendMessage(
            Number(chatId),
            `✅ Your automatic OmniMarket daily reward of $${(result.amountCents / 100).toFixed(2)} has been added to your balance.`,
          ).catch((error) => console.warn("[telegram] could not notify daily reward recipient:", error?.message ?? error));
        }
      } catch (error: any) {
        console.error(`[telegram] daily reward sweep failed for chat ${chatId}:`, error?.message ?? error);
      }
    }
  } catch (error) {
    console.error("[telegram] daily reward sweep failed:", error);
  } finally {
    if (lockAcquired) {
      await lockClient.query("SELECT pg_advisory_unlock(hashtext($1))", ["nexuscc-daily-reward-sweep"]).catch(() => {});
    }
    lockClient.release();
  }
}

let dailyRewardSweepTimer: NodeJS.Timeout | undefined;

function startDailyRewardSweeper(bot: Bot) {
  if (dailyRewardSweepTimer) return;
  void runDailyRewardSweep(bot);
  dailyRewardSweepTimer = setInterval(() => void runDailyRewardSweep(bot), 15 * 60 * 1000);
  dailyRewardSweepTimer.unref?.();
}

async function claimDailyReward(ctx: Context, bot: Bot) {
  if (ctx.chat?.type !== "private") {
    await ctx.reply("Check daily rewards in a private chat with the bot.");
    return;
  }
  if (!(await dailyGate(ctx, bot))) return;
  if (!hasKeyword(ctx)) {
    await ctx.reply(`Keep ${NAME_KEYWORD} in your first or last name to earn the daily reward.`);
    return;
  }
  const chatId = String(ctx.from?.id ?? "");
  try {
    const result = await grantDailyReward(chatId);
    if (result.status === "unlinked") {
      await ctx.reply("Link your OmniMarket account first. Open your profile settings, create a daily-rewards code, then send /link CODE here.");
      return;
    }
    if (result.status === "ineligible") {
      await ctx.reply("This account is not eligible for daily rewards.");
      return;
    }
    if (result.status === "already_paid") {
      await ctx.reply(`Today's automatic reward of $${(result.amountCents / 100).toFixed(2)} has already been added to your balance.`);
      return;
    }
    await ctx.reply(
      `✅ Today's automatic reward of $${(result.amountCents / 100).toFixed(2)} has been added to your OmniMarket balance.`,
    );
  } catch (error) {
    console.error("[telegram] daily reward status check failed:", error);
    await ctx.reply("Your reward status could not be checked. Please try again.");
  }
}

async function ensureDropSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_license_drops (
      id BIGSERIAL PRIMARY KEY,
      license_key TEXT NOT NULL UNIQUE,
      created_by INTEGER REFERENCES users(id),
      created_by_chat_id TEXT,
      claimed_by INTEGER REFERENCES users(id),
      claimed_chat_id TEXT,
      claimed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE telegram_license_drops ADD COLUMN IF NOT EXISTS claimed_chat_id TEXT`);
  await pool.query(`ALTER TABLE telegram_license_drops ALTER COLUMN created_by DROP NOT NULL`);
  await pool.query(`ALTER TABLE telegram_license_drops ADD COLUMN IF NOT EXISTS created_by_chat_id TEXT`);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS telegram_license_drops_available_idx
    ON telegram_license_drops (id) WHERE claimed_by IS NULL
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_license_claims (
      id BIGSERIAL PRIMARY KEY,
      chat_id TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id),
      drop_id BIGINT NOT NULL UNIQUE REFERENCES telegram_license_drops(id),
      chat_referral_bonus_id BIGINT,
      claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE telegram_license_claims ADD COLUMN IF NOT EXISTS chat_id TEXT`);
  await pool.query(`ALTER TABLE telegram_license_claims ALTER COLUMN user_id DROP NOT NULL`);
  await pool.query(`ALTER TABLE telegram_license_claims ADD COLUMN IF NOT EXISTS chat_referral_bonus_id BIGINT`);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS telegram_license_claims_chat_hour_idx
    ON telegram_license_claims (chat_id, claimed_at)
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_chat_members (
      chat_id TEXT PRIMARY KEY,
      telegram_username TEXT,
      name_active BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE telegram_chat_members ADD COLUMN IF NOT EXISTS name_active BOOLEAN NOT NULL DEFAULT FALSE`);
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
    CREATE TABLE IF NOT EXISTS telegram_suspensions (
      chat_id TEXT PRIMARY KEY,
      suspended_until TIMESTAMPTZ NOT NULL
    )
  `);
}

async function registerMember(chatId: string, username: string | null, nameActive: boolean) {
  const existing = await pool.query("SELECT chat_id FROM telegram_chat_members WHERE chat_id = $1", [chatId]);
  await pool.query(
    `INSERT INTO telegram_chat_members (chat_id, telegram_username, name_active)
     VALUES ($1, $2, $3)
     ON CONFLICT (chat_id) DO UPDATE
     SET telegram_username = EXCLUDED.telegram_username,
         name_active = EXCLUDED.name_active`,
    [chatId, username, nameActive],
  );
  return existing.rows.length === 0;
}

async function confirmReferral(referrerChatId: string, referredChatId: string, bot: Bot) {
  if (!referrerChatId || referrerChatId === referredChatId) return;
  const referrer = await pool.query("SELECT chat_id FROM telegram_chat_members WHERE chat_id = $1", [referrerChatId]);
  if (!referrer.rows[0]) return;

  const referral = await pool.query(
    `INSERT INTO telegram_chat_referrals (referrer_chat_id, referred_chat_id)
     VALUES ($1, $2) ON CONFLICT (referred_chat_id) DO NOTHING RETURNING id`,
    [referrerChatId, referredChatId],
  );
  if (!referral.rows[0]) return;
  await pool.query(
    `INSERT INTO telegram_chat_referral_bonuses (referrer_chat_id, referral_id)
     VALUES ($1, $2) ON CONFLICT (referral_id) DO NOTHING`,
    [referrerChatId, referral.rows[0].id],
  );
  await bot.api.sendMessage(
    referrerChatId,
    "🎉 Referral confirmed! Your friend started the bot, so you received one extra free-credit claim.",
    MD,
  ).catch(() => {});
}

async function claimDrop(chatId: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`license-claim:${chatId}`]);
    const usedResult = await client.query(
      `SELECT COUNT(*)::int AS count FROM telegram_license_claims
       WHERE chat_id = $1 AND claimed_at >= NOW() - INTERVAL '24 hours'`,
      [chatId],
    );
    const used = Number(usedResult.rows[0]?.count ?? 0);
    const bonusResult = await client.query(
      `SELECT COUNT(*)::int AS count FROM telegram_chat_referral_bonuses
       WHERE referrer_chat_id = $1 AND used_at IS NULL`,
      [chatId],
    );
    const allowance = CLAIM_LIMIT_PER_WINDOW + Number(bonusResult.rows[0]?.count ?? 0);
    if (used >= allowance) {
      await client.query("COMMIT");
      return { ok: false as const, reason: "limit" as const };
    }

    const drop = await client.query(
      `SELECT id, license_key FROM telegram_license_drops
       WHERE claimed_by IS NULL AND claimed_chat_id IS NULL
       ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1`,
    );
    if (!drop.rows[0]) {
      await client.query("COMMIT");
      return { ok: false as const, reason: "empty" as const };
    }

    let bonusId: number | null = null;
    if (used >= CLAIM_LIMIT_PER_WINDOW) {
      const bonus = await client.query(
        `SELECT id FROM telegram_chat_referral_bonuses
         WHERE referrer_chat_id = $1 AND used_at IS NULL
         ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1`,
        [chatId],
      );
      if (!bonus.rows[0]) {
        await client.query("COMMIT");
        return { ok: false as const, reason: "limit" as const };
      }
      bonusId = bonus.rows[0].id;
      await client.query("UPDATE telegram_chat_referral_bonuses SET used_at = NOW() WHERE id = $1", [bonusId]);
    }

    await client.query(
      `UPDATE telegram_license_drops
       SET claimed_by = NULL, claimed_chat_id = $1, claimed_at = NOW()
       WHERE id = $2`,
      [chatId, drop.rows[0].id],
    );
    await client.query(
      `INSERT INTO telegram_license_claims (chat_id, user_id, drop_id, chat_referral_bonus_id)
       VALUES ($1, NULL, $2, $3)`,
      [chatId, drop.rows[0].id, bonusId],
    );
    await client.query("COMMIT");
    return { ok: true as const, licenseKey: drop.rows[0].license_key, remaining: Math.max(0, allowance - used - 1) };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getClaimStatus(chatId: string) {
  const usedResult = await pool.query(
    `SELECT COUNT(*)::int AS count FROM telegram_license_claims
     WHERE chat_id = $1 AND claimed_at >= NOW() - INTERVAL '24 hours'`,
    [chatId],
  );
  const bonusResult = await pool.query(
    `SELECT COUNT(*)::int AS count FROM telegram_chat_referral_bonuses
     WHERE referrer_chat_id = $1 AND used_at IS NULL`,
    [chatId],
  );
  const allowance = CLAIM_LIMIT_PER_WINDOW + Number(bonusResult.rows[0]?.count ?? 0);
  return { used: Number(usedResult.rows[0]?.count ?? 0), allowance };
}

async function sendStatus(ctx: Context) {
  const chatId = getChatId(ctx);
  const claims = await getClaimStatus(chatId);
  const stock = await pool.query(
    "SELECT COUNT(*)::int AS count FROM telegram_license_drops WHERE claimed_by IS NULL AND claimed_chat_id IS NULL",
  );
  const suspension = await pool.query(
    "SELECT suspended_until FROM telegram_suspensions WHERE chat_id = $1 AND suspended_until > NOW()",
    [chatId],
  );
  const suspendedUntil = suspension.rows[0]?.suspended_until
    ? new Date(suspension.rows[0].suspended_until)
    : null;
  const access = getClaimAccess({ hasRequiredName: hasKeyword(ctx), suspendedUntil });
  const accessLine = access.allowed
    ? "✅ Active"
    : access.reason === "suspended"
      ? `⛔ Suspended until *${suspendedUntil?.toISOString().replace(".000Z", " UTC")}*`
      : `⚠️ Add *${NAME_KEYWORD}* to your first or last name`;

  await ctx.reply(
    `👤 *Free-credit status*\n\n` +
    `Access: ${accessLine}\n` +
    `Claims in the last 24 hours: *${claims.used}/${claims.allowance} used*\n` +
    `Claims remaining: *${Math.max(0, claims.allowance - claims.used)}*\n` +
    `Free credits available: *${Number(stock.rows[0]?.count ?? 0)}*`,
    { ...MD, reply_markup: botKeyboard() },
  );
}

async function sendClaim(ctx: Context) {
  const chatId = getChatId(ctx);
  const suspension = await pool.query(
    "SELECT suspended_until FROM telegram_suspensions WHERE chat_id = $1 AND suspended_until > NOW()",
    [chatId],
  );
  const suspendedUntil = suspension.rows[0]?.suspended_until
    ? new Date(suspension.rows[0].suspended_until)
    : null;
  const access = getClaimAccess({ hasRequiredName: hasKeyword(ctx), suspendedUntil });
  if (!access.allowed) {
    await ctx.reply(
      access.reason === "suspended"
        ? `⛔ Your free-credit access is suspended until *${suspendedUntil?.toISOString().replace(".000Z", " UTC")}*.`
        : `⚠️ Add *${NAME_KEYWORD}* to your Telegram first or last name, then try /claim again.`,
      { ...MD, reply_markup: botKeyboard() },
    );
    return;
  }

  const result = await claimDrop(chatId);
  if (!result.ok) {
    await ctx.reply(
      result.reason === "empty"
        ? "📭 There are no free credits available right now. Please check back later."
        : `⏳ Your 24-hour free-credit allowance is used. Try again after 24 hours.`,
      { ...MD, reply_markup: botKeyboard() },
    );
    return;
  }
  await ctx.reply(
    `🎁 *Your free credit:*\n\n${result.licenseKey}\n\nClaims remaining in the last 24 hours: ${result.remaining}`,
    { ...MD, reply_markup: botKeyboard() },
  );
}

async function handleNameState(ctx: Context) {
  const chatId = getChatId(ctx);
  if (!chatId) return;
  const nowHas = hasKeyword(ctx);
  const current = await pool.query("SELECT name_active FROM telegram_chat_members WHERE chat_id = $1", [chatId]);
  await pool.query(
    `INSERT INTO telegram_chat_members (chat_id, telegram_username, name_active)
     VALUES ($1, $2, $3)
     ON CONFLICT (chat_id) DO UPDATE
     SET telegram_username = EXCLUDED.telegram_username`,
    [chatId, ctx.from?.username ?? null, nowHas],
  );
  const hadBefore = current.rows[0]?.name_active === true;
  if (nowHas && !hadBefore) {
    await ctx.reply(`✅ Your name is active. You can now claim free credit with /claim.\n\nKeep *${NAME_KEYWORD}* in your name.`, MD);
  } else if (!nowHas && hadBefore) {
    await pool.query(
      `INSERT INTO telegram_suspensions (chat_id, suspended_until)
       VALUES ($1, NOW() + INTERVAL '3 days')
       ON CONFLICT (chat_id) DO UPDATE SET suspended_until = EXCLUDED.suspended_until`,
      [chatId],
    );
    await ctx.reply(`⚠️ *${NAME_KEYWORD}* was removed from your name. Free-credit access is suspended for 3 days.`, MD);
  }
}

async function uploadDrops(ctx: Context, bot: Bot, token: string) {
  const chatId = getChatId(ctx);
  if (!getAdminIds().has(chatId)) {
    await ctx.reply("❌ Only authorized bot administrators can upload free credits.", MD);
    return;
  }
  const document = (ctx.message as any)?.document;
  const fileName = String(document?.file_name ?? "").toLowerCase();
  if (!document || !/\.(txt|csv)$/.test(fileName)) {
    await ctx.reply("❌ Upload a .txt or .csv file with one free credit per line.", MD);
    return;
  }
  if (Number(document.file_size ?? 0) > MAX_LICENSE_FILE_BYTES) {
    await ctx.reply("❌ Credit files must be 5 MB or smaller.", MD);
    return;
  }
  try {
    const file = await bot.api.getFile(document.file_id);
    if (!file.file_path) throw new Error("Telegram did not provide a file path.");
    const response = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`);
    if (!response.ok) throw new Error("Could not download the uploaded file.");
    const keys = parseLicenseKeyFile(await response.text());
    const result = await pool.query(
      `INSERT INTO telegram_license_drops (license_key, created_by_chat_id)
       SELECT DISTINCT value, $2 FROM unnest($1::text[]) AS input(value)
       ON CONFLICT (license_key) DO NOTHING RETURNING id`,
      [keys, chatId],
    );
    await ctx.reply(`✅ Free-credit queue updated.\n\nAdded: *${result.rowCount ?? 0}*\nSkipped duplicates: ${keys.length - (result.rowCount ?? 0)}`, MD);
  } catch (error: any) {
    console.error("[telegram] free-credit upload failed:", error?.message ?? error);
    await ctx.reply(`❌ Upload failed: ${error?.message ?? "Invalid credit file"}`);
  }
}

function registerDropHandlers(bot: Bot, token: string) {
  const schemaReady = Promise.all([ensureDropSchema(), ensureTelegramReferralSchema()]).catch((error) => {
    console.error("[telegram] free-credit schema setup failed:", error);
  });
  bot.use(async (_ctx, next) => {
    await schemaReady;
    return next();
  });
  bot.use(async (ctx, next) => {
    const groupId = getGroupId();
    const userId = ctx.from?.id;
    const text = (ctx.message as { text?: string } | undefined)?.text ?? "";
    const callback = ctx.callbackQuery?.data ?? "";
    const dailyFlow = text.startsWith("/start") || text.startsWith("/daily") || text.startsWith("/link") ||
      callback.startsWith("daily_");
    if (dailyFlow) return next();
    if (!groupId || !userId) return next();
    try {
      const member = await ctx.api.getChatMember(groupId, userId);
      if (["creator", "administrator", "member", "restricted"].includes(member.status)) return next();
      await ctx.reply(`🔒 Join the group before using the free-credit bot.\n\n👉 ${getJoinUrl()}`);
    } catch (error: any) {
      console.error("[telegram] group membership check failed:", error?.message ?? error);
      await ctx.reply(`🔒 Join the group before using the free-credit bot.\n\n👉 ${getJoinUrl()}`);
    }
  });
  bot.use(async (ctx, next) => {
    const messageText = (ctx.message as { text?: string } | undefined)?.text ?? "";
    if (messageText.startsWith("/start")) return next();
    handleNameState(ctx).catch((error) => console.error("[telegram] name check failed:", error?.message ?? error));
    return next();
  });

  bot.command("start", async (ctx) => {
    const chatId = getChatId(ctx);
    const isNew = await registerMember(chatId, ctx.from?.username ?? null, hasKeyword(ctx));
    const match = getMatch(ctx);
    if (isNew && match.startsWith("ref_")) {
      await confirmReferral(match.slice(4).trim(), chatId, bot);
    }
    if (match.startsWith("daily_")) {
      const referrerChatId = match.slice(6).trim();
      if (/^\d+$/.test(referrerChatId) && referrerChatId !== chatId) {
        await pool.query(
          `INSERT INTO telegram_daily_reward_referrals (referrer_chat_id, referred_chat_id)
           VALUES ($1, $2) ON CONFLICT (referred_chat_id) DO NOTHING`,
          [referrerChatId, chatId],
        );
      }
    }
    await ctx.reply(
      `👋 Welcome to OmniMarket rewards!\n\n` +
      `Join our channel, keep *${NAME_KEYWORD}* in your Telegram first or last name, and link your OmniMarket account to receive $0.25 automatically each qualifying day.\n\n` +
      `/daily — check today's reward status\n/dailyref — get your daily-rewards referral link\n/link CODE — link your OmniMarket account\n\n` +
      `The original free-credit drops are still available with /claim.`,
      { ...MD, reply_markup: botKeyboard() },
    );
  });
  bot.command("link", (ctx) => linkDailyRewards(ctx, bot));
  bot.command("daily", (ctx) => claimDailyReward(ctx, bot));
  bot.command("dailyref", async (ctx) => {
    if (ctx.chat?.type !== "private") {
      await ctx.reply("Request your referral link in a private chat with the bot.");
      return;
    }
    if (!(await dailyGate(ctx, bot))) return;
    if (!hasKeyword(ctx)) {
      await ctx.reply(`Keep ${NAME_KEYWORD} in your first or last name before sharing a reward link.`);
      return;
    }
    const chatId = getChatId(ctx);
    const info = await bot.api.getMe();
    await ctx.reply(
      `Share this referral link now—even before linking your OmniMarket account:\nhttps://t.me/${info.username}?start=daily_${chatId}\n\n` +
      `You and your referred friend can earn an extra $0.10/day while eligible. Link your account with /link CODE to receive rewards.`,
    );
  });
  bot.callbackQuery("daily_reward", async (ctx) => {
    await ctx.answerCallbackQuery();
    await claimDailyReward(ctx, bot);
  });
  bot.callbackQuery("daily_referrals", async (ctx) => {
    await ctx.answerCallbackQuery();
    if (ctx.chat?.type !== "private") {
      await ctx.reply("Request your referral link in a private chat with the bot.");
      return;
    }
    if (!(await dailyGate(ctx, bot))) return;
    if (!hasKeyword(ctx)) {
      await ctx.reply(`Keep ${NAME_KEYWORD} in your Telegram first or last name before sharing your link.`);
      return;
    }
    const chatId = getChatId(ctx);
    const info = await bot.api.getMe();
    await ctx.reply(
      `Your daily-rewards referral link (you can share it before linking your account):\n` +
      `https://t.me/${info.username}?start=daily_${chatId}\n\n` +
      `Link your account with /link CODE to receive eligible daily rewards and referral payouts.`,
    );
  });
  bot.callbackQuery("daily_check_join", async (ctx) => {
    await ctx.answerCallbackQuery();
    await claimDailyReward(ctx, bot);
  });
  bot.command("claim", sendClaim);
  bot.command("status", sendStatus);
  bot.callbackQuery("claim_reward", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendClaim(ctx);
  });
  bot.callbackQuery("account_status", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendStatus(ctx);
  });
  bot.command("ref", async (ctx) => {
    const chatId = getChatId(ctx);
    await registerMember(chatId, ctx.from?.username ?? null, hasKeyword(ctx));
    const info = await bot.api.getMe();
    await ctx.reply(`🔗 Your referral link:\nhttps://t.me/${info.username}?start=ref_${chatId}`);
  });
  bot.on("message:document", async (ctx) => {
    await uploadDrops(ctx, bot, token);
  });
  bot.command("help", async (ctx) => {
    await ctx.reply(
      `*Free-credit bot*\n\n/claim — claim free credit once per 24 hours\n/status — view your status\n/ref — get a referral link\n/help — show this help\n\nAdmins can upload a .txt or .csv file with one credit per line.`,
      { ...MD, reply_markup: botKeyboard() },
    );
  });
  bot.catch((error) => console.error("[telegram] free-credit bot error:", error.error));
}

export function createTelegramBot() {
  const token = getTelegramToken();
  if (!token) {
    log("Telegram bot token not set — bot disabled", "telegram");
    return null;
  }
  const bot = new Bot(token);
  registerDropHandlers(bot, token);
  return bot;
}

export function startTelegramBot() {
  const bot = createTelegramBot();
  if (!bot) return null;
  bot.api.setMyCommands([
    { command: "start", description: "Open the free-credit menu" },
    { command: "daily", description: "Check today's automatic OmniMarket reward" },
    { command: "dailyref", description: "Get your daily reward referral link" },
    { command: "link", description: "Link your OmniMarket account with a one-time code" },
    { command: "claim", description: "Claim free credit" },
    { command: "status", description: "View credit status" },
    { command: "ref", description: "Get a referral link" },
    { command: "help", description: "Show bot help" },
  ]).catch((error) => console.error("[telegram] command menu setup failed:", error?.message ?? error));
  bot.start({
    onStart: () => log("Telegram free-credit bot started (long polling)", "telegram"),
  }).catch((error) => {
    console.error("[telegram] free-credit bot failed to start:", error);
  });
  startDailyRewardSweeper(bot);
  return bot;
}