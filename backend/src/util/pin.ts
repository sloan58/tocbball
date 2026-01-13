/**
 * Generate a 4-digit numeric PIN
 */
export function generateAdminPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}
