import assert from "node:assert/strict";
import test from "node:test";
import { hasRequiredTelegramName } from "./telegram-name-policy";

test("Telegram name requirement needs omnimarket.cc case-insensitively across first and last name", () => {
  assert.equal(hasRequiredTelegramName("omnimarket.cc", "Buyer"), true);
  assert.equal(hasRequiredTelegramName("buyer", "OMNIMARKET.CC"), true);
  assert.equal(hasRequiredTelegramName("OmniMarket", "Buyer"), false);
  assert.equal(hasRequiredTelegramName("Buyer", "Customer"), false);
});