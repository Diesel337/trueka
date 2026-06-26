import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { getSupabasePublicConfig } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

type ReadinessStatus = "ok" | "missing" | "error" | "skipped";

type ReadinessBody = {
  ok: boolean;
  product: "Trueka";
  checks: {
    config: ReadinessStatus;
    database: ReadinessStatus;
  };
  latencyMs: number;
};

export async function GET() {
  const startedAt = Date.now();
  const { url, anonKey } = getSupabasePublicConfig();

  if (!url || !anonKey) {
    return readinessResponse(
      {
        ok: false,
        product: "Trueka",
        checks: {
          config: "missing",
          database: "skipped",
        },
        latencyMs: Date.now() - startedAt,
      },
      503,
    );
  }

  const supabase = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  const { error } = await supabase.from("categories").select("id").limit(1);

  if (error) {
    return readinessResponse(
      {
        ok: false,
        product: "Trueka",
        checks: {
          config: "ok",
          database: "error",
        },
        latencyMs: Date.now() - startedAt,
      },
      503,
    );
  }

  return readinessResponse({
    ok: true,
    product: "Trueka",
    checks: {
      config: "ok",
      database: "ok",
    },
    latencyMs: Date.now() - startedAt,
  });
}

function readinessResponse(body: ReadinessBody, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
