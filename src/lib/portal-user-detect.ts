import { DEMO_EMAILS } from "@/lib/demo-accounts";

/**
 * Checks if a user email belongs to the business/portal demo account.
 * These users should be redirected to /portal/galerie instead of /home.
 */
export function isPortalBusinessEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.toLowerCase() === DEMO_EMAILS.business;
}

/**
 * Returns the correct post-login redirect path for a user,
 * taking portal/business accounts into account.
 */
export function getPostLoginPath(
  role: string,
  email: string | undefined | null
): string {
  // Business/portal demo account → portal gallery
  if (isPortalBusinessEmail(email)) {
    return "/portal/galerie";
  }

  const roleToPath: Record<string, string> = {
    admin: "/admin/mission-control",
    provider: "/home",
    employee: "/employee",
    partner: "/partner-home",
    client: "/client-home",
  };

  return roleToPath[role] || "/home";
}
