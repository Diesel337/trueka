export function filterItemsByBlockedCounterparties<T extends { ownerId: string }>(
  items: T[],
  blockedCounterpartyIds: string[],
) {
  if (blockedCounterpartyIds.length === 0) {
    return items;
  }

  const blockedCounterparties = new Set(blockedCounterpartyIds);

  return items.filter((item) => !blockedCounterparties.has(item.ownerId));
}
