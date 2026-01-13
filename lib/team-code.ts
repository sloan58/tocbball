/**
 * Generate a readable team code (e.g., "ABC123")
 */
export function generateTeamCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate a 4-digit numeric PIN
 */
export function generateAdminPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}
