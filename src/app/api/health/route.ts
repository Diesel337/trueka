import { NextResponse } from "next/server";

import { createOperationalRequestId, getOperationalMetadata } from "@/lib/observability";

export function GET() {
  const requestId = createOperationalRequestId();

  return NextResponse.json(
    {
      ok: true,
      product: "Trueka",
      requestId,
      operational: getOperationalMetadata(),
      rules: {
        payments: false,
        managedShipping: false,
        moneyInTradeRequests: false,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Trueka-Request-Id": requestId,
      },
    },
  );
}
