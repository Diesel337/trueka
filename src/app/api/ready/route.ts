import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  createOperationalRequestId,
  getErrorMessage,
  getOperationalMetadata,
  logOperationalEvent,
} from "@/lib/observability";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

type ReadinessStatus = "ok" | "missing" | "error" | "skipped";

type ReadinessBody = {
  ok: boolean;
  product: "Trueka";
  requestId: string;
  checks: {
    config: ReadinessStatus;
    database: ReadinessStatus;
  };
  operational: ReturnType<typeof getOperationalMetadata>;
  latencyMs: number;
};

export async function GET() {
  const startedAt = Date.now();
  const requestId = createOperationalRequestId();
  const { url, anonKey } = getSupabasePublicConfig();

  if (!url || !anonKey) {
    const latencyMs = Date.now() - startedAt;

    logOperationalEvent("warn", "ready_missing_supabase_config", {
      requestId,
      latencyMs,
    });

    return readinessResponse(
      {
        ok: false,
        product: "Trueka",
        requestId,
        checks: {
          config: "missing",
          database: "skipped",
        },
        operational: getOperationalMetadata(),
        latencyMs,
      },
      503,
      requestId,
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
    const latencyMs = Date.now() - startedAt;

    logOperationalEvent("error", "ready_database_error", {
      requestId,
      latencyMs,
      error: getErrorMessage(error),
    });

    return readinessResponse(
      {
        ok: false,
        product: "Trueka",
        requestId,
        checks: {
          config: "ok",
          database: "error",
        },
        operational: getOperationalMetadata(),
        latencyMs,
      },
      503,
      requestId,
    );
  }

  const latencyMs = Date.now() - startedAt;

  logOperationalEvent("info", "ready_ok", {
    requestId,
    latencyMs,
  });

  return readinessResponse(
    {
      ok: true,
      product: "Trueka",
      requestId,
      checks: {
        config: "ok",
        database: "ok",
      },
      operational: getOperationalMetadata(),
      latencyMs,
    },
    200,
    requestId,
  );
}

function readinessResponse(body: ReadinessBody, status = 200, requestId?: string) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...(requestId ? { "X-Trueka-Request-Id": requestId } : {}),
    },
  });
}
