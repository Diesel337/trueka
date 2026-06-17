import type { Item, ItemStatus } from "./types";

type RestoreSource = {
  previousItemStatus?: string;
  previousItemModerationStatus?: string;
};

const restorableItemStatuses = new Set<ItemStatus>([
  "draft",
  "active",
  "paused",
  "reserved",
  "traded",
]);

const restorableModerationStatuses = new Set<Item["moderationStatus"]>([
  "pending",
  "active",
  "flagged",
  "rejected",
]);

export function getRestoredItemState(source?: RestoreSource | null): {
  status: ItemStatus;
  moderationStatus: Item["moderationStatus"];
} {
  const status = restorableItemStatuses.has(source?.previousItemStatus as ItemStatus)
    ? source?.previousItemStatus as ItemStatus
    : "active";
  const moderationStatus = restorableModerationStatuses.has(
    source?.previousItemModerationStatus as Item["moderationStatus"],
  )
    ? source?.previousItemModerationStatus as Item["moderationStatus"]
    : "active";

  return {
    status,
    moderationStatus,
  };
}
