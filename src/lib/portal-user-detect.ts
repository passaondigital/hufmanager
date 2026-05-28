import { DEMO_EMAILS } from "@/lib/demo-accounts";

/**
 * Checks if a user email belongs to the business/portal demo account.
 */
export function isPortalBusinessEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.toLowerCase() === DEMO_EMAILS.business;
}

/**
 * Checks if a user email belongs to the Stallbetreiber demo account.
 */
export function isStallbetreiberDemoEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.toLowerCase() === DEMO_EMAILS.stallbetreiber;
}

/**
 * Returns the correct post-login redirect path for a user,
 * taking portal/business/stallbetreiber accounts into account.
 */
export function getPostLoginPath(
  role: string,
  email: string | undefined | null
): string {
  if (isPortalBusinessEmail(email)) {
    return "/portal/galerie";
  }

  if (isStallbetreiberDemoEmail(email)) {
    return "/stall/dashboard";
  }

  const roleToPath: Record<string, string> = {
    admin: "/home",
    provider: "/home",
    employee: "/employee",
    partner: "/partner-home",
    client: "/client-home",
  };

  return roleToPath[role] || "/home";
}
