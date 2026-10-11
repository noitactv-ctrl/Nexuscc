import assert from "node:assert/strict";
import test from "node:test";
import { hasRequiredTelegramName } from "./telegram-name-policy";

test("Telegram name requirement is case-insensitive across first and last name", () => {
  assert.equal(hasRequiredTelegramName("nexuscards.xyz", "Buyer"), true);
  assert.equal(hasRequiredTelegramName("buyer", "NEXUSCARDS.XYZ"), true);
  assert.equal(hasRequiredTelegramName("Buyer", "Customer"), false);
});