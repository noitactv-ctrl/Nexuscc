import { timingSafeEqual } from "node:crypto";
import { createTelegramBot, runDailyRewardSweep } from "../server/telegram.js";

type VercelRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status(code: number): VercelResponse;
  json(body: unknown): VercelResponse;
};

let bot: ReturnType<typeof createTelegramBot> | undefined;

function headerValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function dailyRewardsSweepHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    res.status(503).json({ message: "Cron authorization is not configured." });
    return;
  }
  const authorization = headerValue(req.headers.authorization);
  const expected = Buffer.from(`Bearer ${cronSecret}`);
  const received = Buffer.from(authorization);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  bot ??= createTelegramBot();
  if (!bot) {
    res.status(503).json({ message: "Telegram bot is not configured." });
    return;
  }
  try {
    await runDailyRewardSweep(bot);
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[telegram] scheduled daily reward sweep failed:", error);
    res.status(500).json({ message: "Daily reward sweep failed." });
  }
}
