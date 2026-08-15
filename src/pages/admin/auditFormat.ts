import type { AdminAuditLog, AuditActionValue } from "../../types";

export const ACTION_DOT_CLASSES: Record<AuditActionValue, string> = {
  CREATE: "bg-success",
  UPDATE: "bg-primary",
  DELETE: "bg-danger",
  APPROVE: "bg-success",
  REJECT: "bg-danger",
  SUSPEND: "bg-warning",
  RESTORE: "bg-primary",
  LOGIN: "bg-ink-muted",
  ROLE_CHANGE: "bg-secondary",
};

export const ACTION_BADGE_TONES: Record<AuditActionValue, "success" | "blue" | "danger" | "amber" | "purple" | "neutral"> = {
  CREATE: "success",
  UPDATE: "blue",
  DELETE: "danger",
  APPROVE: "success",
  REJECT: "danger",
  SUSPEND: "amber",
  RESTORE: "blue",
  LOGIN: "neutral",
  ROLE_CHANGE: "purple",
};

const ACTION_LABEL_UZ: Record<AuditActionValue, string> = {
  CREATE: "yaratdi",
  UPDATE: "tahrirladi",
  DELETE: "o'chirdi",
  APPROVE: "tasdiqladi",
  REJECT: "rad etdi",
  SUSPEND: "to'xtatdi",
  RESTORE: "tikladi",
  LOGIN: "tizimga kirdi",
  ROLE_CHANGE: "rolini o'zgartirdi",
};

const ENTITY_LABEL_UZ: Record<string, string> = {
  Business: "biznes",
  User: "foydalanuvchi",
  Review: "sharh",
  Event: "tadbir",
  Category: "turkum",
};

export function describeAuditLog(log: AdminAuditLog): string {
  const entity = ENTITY_LABEL_UZ[log.entityType] ?? log.entityType;
  const action = ACTION_LABEL_UZ[log.action] ?? log.action;
  const idSuffix = log.entityId != null ? ` #${log.entityId}` : "";
  return `${entity}${idSuffix} ${action}`;
}

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return "hozirgina";
  if (minutes < 60) return `${minutes} daqiqa oldin`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} soat oldin`;
  const days = Math.floor(hours / 24);
  return `${days} kun oldin`;
}
