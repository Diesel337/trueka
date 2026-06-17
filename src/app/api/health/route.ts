import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    product: "Trueka",
    rules: {
      payments: false,
      managedShipping: false,
      moneyInTradeRequests: false,
    },
  });
}
