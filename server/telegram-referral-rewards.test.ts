import assert from "node:assert/strict";
import test from "node:test";
import {
  DAILY_REFERRAL_START_BONUS_CENTS,
  payPendingDailyReferralStartBonuses,
} from "./telegram-referral-rewards.js";

function fakePool(
  pending: Array<{ referral_id: number; referrer_user_id: number }>,
  alreadyPaid: Set<number> = new Set(),
) {
  const queries: Array<{ text: string; values?: unknown[] }> = [];
  return {
    queries,
    connect: async () => ({
      query: async (text: string, values?: unknown[]) => {
        queries.push({ text, values });
        if (text.includes("SELECT r.id AS referral_id")) return { rows: pending, rowCount: pending.length };
        if (text.includes("INSERT INTO telegram_daily_referral_start_payouts")) {
          const referralId = Number(values?.[0]);
          const conflict = alreadyPaid.has(referralId);
          if (!conflict) alreadyPaid.add(referralId);
          return { rows: conflict ? [] : [{ id: referralId }], rowCount: conflict ? 0 : 1 };
        }
        return { rows: [], rowCount: 1 };
      },
      release: () => {},
    }),
  };
}

test("pays one $1 bonus per eligible new referral", async () => {
  const database = fakePool([
    { referral_id: 11, referrer_user_id: 42 },
    { referral_id: 12, referrer_user_id: 42 },
  ]);

  const paidCount = await payPendingDailyReferralStartBonuses("telegram-referrer", database as any);
  const balanceCredits = database.queries.filter((query) => query.text.startsWith("UPDATE users SET balance"));
  const payoutRows = database.queries.filter((query) => query.text.includes("INSERT INTO telegram_daily_referral_start_payouts"));

  assert.equal(DAILY_REFERRAL_START_BONUS_CENTS, 100);
  assert.equal(paidCount, 2);
  assert.deepEqual(balanceCredits.map((query) => query.values), [[100, 42], [100, 42]]);
  assert.equal(payoutRows.length, 2);
});

test("does not credit a referral whose unique payout row already exists", async () => {
  const database = fakePool(
    [{ referral_id: 11, referrer_user_id: 42 }],
    new Set([11]),
  );

  const paidCount = await payPendingDailyReferralStartBonuses("telegram-referrer", database as any);

  assert.equal(paidCount, 0);
  assert.equal(database.queries.some((query) => query.text.startsWith("UPDATE users SET balance")), false);
});

test("does not pay when no linked referrer has a pending new referral", async () => {
  const database = fakePool([]);

  const paidCount = await payPendingDailyReferralStartBonuses("unlinked-referrer", database as any);

  assert.equal(paidCount, 0);
  assert.equal(database.queries.some((query) => query.text.includes("INSERT INTO telegram_daily_referral_start_payouts")), false);
});
