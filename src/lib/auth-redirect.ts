const defaultNext = "/items";

export function normalizeInternalNext(value?: string | null) {
  if (!value) {
    return defaultNext;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue || !trimmedValue.startsWith("/") || trimmedValue.startsWith("//")) {
    return defaultNext;
  }

  return trimmedValue;
}
