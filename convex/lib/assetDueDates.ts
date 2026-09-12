export const ASSET_DUE_SOON_DAYS = 30;
export type DueState = "CURRENT" | "DUE_SOON" | "OVERDUE" | "NO_DUE_DATE";
export function assetDueState(
  dueDate: string | undefined,
  today: string,
): DueState {
  if (!dueDate) return "NO_DUE_DATE";
  if (dueDate < today) return "OVERDUE";
  const days =
    (Date.parse(`${dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
    86400000;
  return days <= ASSET_DUE_SOON_DAYS ? "DUE_SOON" : "CURRENT";
}
