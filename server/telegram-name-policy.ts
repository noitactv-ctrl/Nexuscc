export const TELEGRAM_NAME_KEYWORD = "gorillacc.at";

export function hasRequiredTelegramName(
  firstName?: string | null,
  lastName?: string | null,
): boolean {
  const displayName = `${firstName ?? ""} ${lastName ?? ""}`.toLowerCase();
  return displayName.includes(TELEGRAM_NAME_KEYWORD.toLowerCase());
}