export const TRUSTED_USER_ROLES = ["provider", "client", "admin", "employee", "partner"] as const;

export type TrustedUserRole = (typeof TRUSTED_USER_ROLES)[number];
export type RoleResolutionStatus = "resolved" | "not_found" | "invalid" | "error";

export interface RoleResolution {
  status: RoleResolutionStatus;
  role: TrustedUserRole | null;
}

export function resolveTrustedRole(rawRole: unknown): RoleResolution {
  if (rawRole === null || rawRole === undefined || rawRole === "") {
    return { status: "not_found", role: null };
  }

  if (typeof rawRole !== "string") {
    return { status: "invalid", role: null };
  }

  if (TRUSTED_USER_ROLES.includes(rawRole as TrustedUserRole)) {
    return { status: "resolved", role: rawRole as TrustedUserRole };
  }

  return { status: "invalid", role: null };
}

