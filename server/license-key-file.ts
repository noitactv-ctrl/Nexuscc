export const MAX_LICENSE_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_LICENSE_KEYS_PER_UPLOAD = 10_000;
export const MAX_LICENSE_KEY_CHARACTERS = 1_000;

export function parseLicenseKeyFile(raw: string): string[] {
  if (!raw.trim()) throw new Error("The license-key file is empty");
  if (Buffer.byteLength(raw, "utf8") > MAX_LICENSE_FILE_BYTES) {
    throw new Error("License-key files must be 5 MB or smaller");
  }

  const keys = raw
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  if (keys.length === 0) throw new Error("The license-key file contains no keys");
  if (keys.length > MAX_LICENSE_KEYS_PER_UPLOAD) {
    throw new Error(`A single upload may contain at most ${MAX_LICENSE_KEYS_PER_UPLOAD} keys`);
  }

  for (const key of keys) {
    if (Array.from(key).length > MAX_LICENSE_KEY_CHARACTERS || /[\u0000-\u001f\u007f]/.test(key)) {
      throw new Error(`Each drop must be at most ${MAX_LICENSE_KEY_CHARACTERS} printable characters on one line`);
    }
    if (
      /(?:\bpan\b|\bcvv\b|\bcvc\b|card\s*number|security\s*code)/i.test(key) ||
      /^\d{12,19}(?:[|,:/\s]+\d{1,2}[/-]\d{2,4})?(?:[|,:/\s]+\d{3,4})?$/.test(key)
    ) {
      throw new Error("This upload resembles payment-card data and was rejected");
    }
  }
  return keys;
}