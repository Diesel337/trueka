export type PostalCodeProximity = {
  rank: number;
  score: number;
};

const postalCodePattern = /^\d{5}$/;

export function normalizePostalCode(value?: string | null) {
  const digits = value?.replace(/\D/g, "").slice(0, 5) ?? "";

  return postalCodePattern.test(digits) ? digits : undefined;
}

export function getPublicPostalCodeArea(value?: string | null) {
  const postalCode = normalizePostalCode(value);

  return postalCode ? `${postalCode.slice(0, 3)}00` : undefined;
}

export function getPostalCodeProximity(
  itemPostalCode?: string | null,
  viewerPostalCode?: string | null,
): PostalCodeProximity {
  const itemCode = normalizePostalCode(itemPostalCode);
  const viewerCode = normalizePostalCode(viewerPostalCode);

  if (!itemCode || !viewerCode) {
    return { rank: 99, score: 0 };
  }

  if (itemCode === viewerCode) {
    return { rank: 0, score: 100 };
  }

  for (const [digits, rank, score] of [
    [4, 1, 85],
    [3, 2, 70],
    [2, 3, 45],
  ] as const) {
    if (itemCode.slice(0, digits) === viewerCode.slice(0, digits)) {
      return { rank, score };
    }
  }

  return { rank: 50, score: 0 };
}

export function isNearbyPostalCode(itemPostalCode?: string | null, viewerPostalCode?: string | null) {
  return getPostalCodeProximity(itemPostalCode, viewerPostalCode).score >= 45;
}
