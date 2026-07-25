const defaultNext = "/items";
const internalOrigin = "https://trueka.internal";
const unsafeEncodedSeparatorPattern = /%(?:0[0-9a-f]|2f|5c)/i;
const unsafeCharacterPattern = /[\u0000-\u001f\u007f\\]/;

export function normalizeInternalNext(value?: string | null) {
  if (!value) {
    return defaultNext;
  }

  const trimmedValue = value.trim();

  if (
    !trimmedValue
    || !trimmedValue.startsWith("/")
    || trimmedValue.startsWith("//")
    || unsafeCharacterPattern.test(trimmedValue)
    || unsafeEncodedSeparatorPattern.test(trimmedValue)
  ) {
    return defaultNext;
  }

  try {
    const parsed = new URL(trimmedValue, internalOrigin);

    if (parsed.origin !== internalOrigin || !parsed.pathname.startsWith("/")) {
      return defaultNext;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return defaultNext;
  }
}
