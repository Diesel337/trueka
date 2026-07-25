import { NextResponse, type NextRequest } from "next/server";

import {
  protectedMediaBuckets,
  type ProtectedMediaBucket,
} from "@/lib/media-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type MediaRouteContext = {
  params: Promise<{
    bucket: string;
    path: string[];
  }>;
};

export async function GET(_request: NextRequest, context: MediaRouteContext) {
  const { bucket, path } = await context.params;

  if (!isProtectedMediaBucket(bucket) || !isSafeStoragePath(path)) {
    return NextResponse.json({ message: "Archivo no encontrado." }, { status: 404 });
  }

  const supabase = await createSupabaseServerClient();
  const storagePath = path.join("/");
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(storagePath);

  if (error || !data) {
    return NextResponse.json({ message: "Archivo no encontrado." }, { status: 404 });
  }

  return new NextResponse(await data.arrayBuffer(), {
    status: 200,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": data.type || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isProtectedMediaBucket(value: string): value is ProtectedMediaBucket {
  return protectedMediaBuckets.includes(value as ProtectedMediaBucket);
}

function isSafeStoragePath(segments: string[]) {
  return segments.length >= 2
    && segments.every((segment) =>
      Boolean(segment)
      && segment !== "."
      && segment !== ".."
      && !/[\u0000-\u001f\u007f\\/]/.test(segment),
    );
}
