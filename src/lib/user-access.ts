export const APP_ROLES = [
  "leader",
  "scout",
  "medic",
  "sector_lead",
  "operations",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const DEFAULT_APP_ROLE: AppRole = "medic";

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  leader: "قائد",
  scout: "كشاف",
  medic: "مسعف",
  sector_lead: "قائد قطاع",
  operations: "عمليات",
};

export function normalizeAppRole(role: unknown): AppRole | null {
  return typeof role === "string" && (APP_ROLES as readonly string[]).includes(role)
    ? (role as AppRole)
    : null;
}

export function getDefaultAppRole(role: unknown): AppRole {
  return normalizeAppRole(role) ?? DEFAULT_APP_ROLE;
}

export function isTeamLeaderRole(role: AppRole): boolean {
  return role === "leader";
}

export function isSectorRole(role: AppRole): boolean {
  return role === "sector_lead" || role === "leader";
}

export function isOperationsRole(role: AppRole): boolean {
  return role === "operations";
}

export function isTeamAssignableRole(role: AppRole): boolean {
  return role === "leader" || role === "scout" || role === "medic";
}
