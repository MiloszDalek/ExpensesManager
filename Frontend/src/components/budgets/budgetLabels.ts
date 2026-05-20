import type { TFunction } from "i18next";

export function getBudgetStatusLabel(status: "active" | "archived", t: TFunction): string {
  if (status === "active") {
    return t("budgets.status.active");
  }
  return t("budgets.status.archived");
}

export function getPoolStatusLabel(status: "on_track" | "warning" | "exceeded", t: TFunction): string {
  if (status === "on_track") {
    return t("budgets.poolStatus.onTrack");
  }
  if (status === "warning") {
    return t("budgets.poolStatus.warning");
  }
  return t("budgets.poolStatus.exceeded");
}
