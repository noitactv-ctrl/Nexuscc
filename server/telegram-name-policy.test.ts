import assert from "node:assert/strict";
import test from "node:test";
import { hasRequiredTelegramName } from "./telegram-name-policy";

test("Telegram name requirement is case-insensitive across first and last name", () => {
  assert.equal(hasRequiredTelegramName("NexusCC.cc", "Buyer"), true);
  assert.equal(hasRequiredTelegramName("buyer", "nexuscc.cc"), true);
  assert.equal(hasRequiredTelegramName("Buyer", "Customer"), false);
});