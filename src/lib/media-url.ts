export const protectedMediaBuckets = ["item-photos", "profile-avatars"] as const;

export type ProtectedMediaBucket = (typeof protectedMediaBuckets)[number];

export function getProtectedMediaUrl(bucket: ProtectedMediaBucket, storagePath: string) {
  const encodedPath = storagePath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `/api/media/${bucket}/${encodedPath}`;
}

export function normalizeStoredMediaUrl(
  value: string | undefined,
  bucket: ProtectedMediaBucket,
) {
  if (!value) {
    return undefined;
  }

  if (value.startsWith(`/api/media/${bucket}/`)) {
    return value;
  }

  try {
    const parsed = new URL(value, "https://trueka.internal");
    const markers = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/object/sign/${bucket}/`,
    ];
    const marker = markers.find((candidate) => parsed.pathname.includes(candidate));

    if (!marker) {
      return value;
    }

    const storagePath = decodeURIComponent(parsed.pathname.split(marker)[1] ?? "");

    return storagePath ? getProtectedMediaUrl(bucket, storagePath) : value;
  } catch {
    return value;
  }
}
