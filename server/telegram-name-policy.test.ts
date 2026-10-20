import assert from "node:assert/strict";
import test from "node:test";
import { hasRequiredTelegramName } from "./telegram-name-policy";

test("Telegram name requirement needs gorillacc.at case-insensitively across first and last name", () => {
  assert.equal(hasRequiredTelegramName("gorillacc.at", "Buyer"), true);
  assert.equal(hasRequiredTelegramName("buyer", "GORILLACC.AT"), true);
  assert.equal(hasRequiredTelegramName("GorillaCC", "Buyer"), false);
  assert.equal(hasRequiredTelegramName("Buyer", "Customer"), false);
});