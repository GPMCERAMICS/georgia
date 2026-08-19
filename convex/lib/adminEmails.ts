/**
 * ADMIN_EMAIL holds one or more comma-separated addresses. Everyone listed is
 * a full admin — there are no roles, just the allowlist.
 */
export function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAIL;
  if (!raw) {
    throw new Error("ADMIN_EMAIL is not configured on this deployment");
  }
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}
