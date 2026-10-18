---
name: Telegram daily rewards
description: Keep the paid daily-rewards campaign separate from Telegram free-credit drops.
---

All Telegram bot commands require membership in the configured OmniMarket channel; `/start` must show only the join prompt until membership is confirmed. The daily-rewards campaign automatically pays $1.00 per qualifying day. A referrer earns a one-time $1.00 for each unique new Telegram user who starts the bot through their `/dailyref` link; credit is paid to the referrer's linked website balance and remains pending until the referrer links. The referred user earns an extra 10 cents per qualifying day. Daily-reward wallet payouts require joining the channel, keeping `OmniMarket` in the Telegram display name, and linking the website account.

Users may share their daily referral link after passing the channel and display-name gates, before linking their website account. Account linking remains required to receive daily rewards and referral payouts.

**Why:** The user requested a required channel gate for every bot command, share-before-linking, a $1.00 base daily payout, and a one-time $1.00 referrer reward for each new bot starter; drop referrals remain separate.

**How to apply:** Enforce the channel gate before command and callback handlers, including `/start`. Keep daily claims, referral attribution, and wallet links in their own records and transactions. Do not repurpose the free-credit claim/referral tables or require store-account linking to claim drops.
