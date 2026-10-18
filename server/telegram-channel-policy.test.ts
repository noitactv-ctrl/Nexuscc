import assert from "node:assert/strict";
import test from "node:test";
import { isRequiredChannelMember } from "./telegram-channel-policy.js";

test("accepts members and channel administrators", () => {
  for (const status of ["creator", "administrator", "member"]) {
    assert.equal(isRequiredChannelMember(status), true);
  }
});

test("accepts restricted members only when Telegram confirms membership", () => {
  assert.equal(isRequiredChannelMember("restricted", true), true);
  assert.equal(isRequiredChannelMember("restricted", false), false);
  assert.equal(isRequiredChannelMember("restricted"), false);
});

test("blocks users who left or were removed from the channel", () => {
  assert.equal(isRequiredChannelMember("left"), false);
  assert.equal(isRequiredChannelMember("kicked"), false);
});
