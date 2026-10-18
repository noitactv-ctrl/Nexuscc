export function isRequiredChannelMember(status: string, isMember?: boolean) {
  return status === "creator" || status === "administrator" || status === "member" ||
    (status === "restricted" && isMember === true);
}
