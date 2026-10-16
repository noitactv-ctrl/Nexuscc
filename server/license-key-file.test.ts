import assert from "node:assert/strict";
import test from "node:test";
import { MAX_LICENSE_KEY_CHARACTERS, parseLicenseKeyFile } from "./license-key-file";

test("parses one license key from every non-empty line", () => {
  assert.deepEqual(
    parseLicenseKeyFile("AAAA-BBBB-CCCC\n\nDDDD-EEEE-FFFF\n"),
    ["AAAA-BBBB-CCCC", "DDDD-EEEE-FFFF"],
  );
});

test("rejects payment-card-like lines from license key uploads", () => {
  assert.throws(
    () => parseLicenseKeyFile("4111111111111111|12/30|123"),
    /payment-card data/,
  );
});

test("accepts arbitrary text drops up to 1,000 Unicode characters", () => {
  const drop = "任! ".repeat(333) + "任";
  assert.equal(Array.from(drop).length, MAX_LICENSE_KEY_CHARACTERS);
  assert.deepEqual(parseLicenseKeyFile(drop), [drop]);
});

test("rejects drops longer than 1,000 characters", () => {
  const drop = "x".repeat(MAX_LICENSE_KEY_CHARACTERS + 1);
  assert.throws(() => parseLicenseKeyFile(drop), /at most 1000 printable characters/);
});

test("accepts short text drops", () => {
  assert.deepEqual(parseLicenseKeyFile("!"), ["!"]);
});
