import type { Permission, Role } from "@/types/domain";

const MATRIX: Record<Permission, readonly Role[]> = {
  view: ["owner", "admin", "operator", "approver", "viewer"],
  edit_clinic: ["owner", "admin"],
  manage_team: ["owner", "admin"],
  edit_memory: ["owner", "admin", "operator"],
  edit_suggestion: ["owner", "admin", "operator", "approver"],
  approve: ["owner", "admin", "approver"],
  publish: ["owner", "admin", "approver"],
  send_message: ["owner", "admin", "approver"],
  manage_workflows: ["owner", "admin", "operator"],
  manage_integrations: ["owner", "admin"],
  pause_agent: ["owner", "admin"],
  export_data: ["owner", "admin"],
  set_restricted_autonomy: ["owner", "admin"],
};

export function can(role: Role, permission: Permission) {
  return MATRIX[permission].includes(role);
}

export function permissionDenied() {
  return "Seu perfil não pode fazer essa ação.";
}
