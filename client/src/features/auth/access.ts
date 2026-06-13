export type AppRole = "admin" | "manager" | "cashier" | "loan processor";

const DEFAULT_ROUTE_BY_ROLE: Record<AppRole, string> = {
  admin: "/admin/users",
  manager: "/dashboard",
  cashier: "/collections",
  "loan processor": "/member-management",
};

const ROUTE_ACCESS: Record<string, AppRole[]> = {
  "/dashboard": ["manager"],
  "/member-management": ["loan processor"],
  "/centers": ["loan processor"],
  "/collections": ["cashier"],
  "/portfolio": ["manager"],
  "/transactions": ["manager", "cashier", "loan processor"],
  "/approvals": ["manager"],
  "/waivers": ["manager"],
  "/admin/users": ["admin"],
};

export function getDefaultRouteForRole(role?: string | null): string {
  if (!role) {
    return "/dashboard";
  }
  return DEFAULT_ROUTE_BY_ROLE[role as AppRole] ?? "/dashboard";
}

export function canAccessPath(
  role: string | null | undefined,
  path: string
): boolean {
  if (!role) {
    return false;
  }
  const allowedRoles = ROUTE_ACCESS[path];
  if (!allowedRoles) {
    return true;
  }
  return allowedRoles.includes(role as AppRole);
}
