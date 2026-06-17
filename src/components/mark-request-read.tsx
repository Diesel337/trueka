"use client";

import { useEffect, useTransition } from "react";

import { markTradeRequestReadAction } from "@/app/actions";

export function MarkRequestRead({ requestId }: { requestId: string }) {
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      await markTradeRequestReadAction(requestId);
    });
  }, [requestId, startTransition]);

  return null;
}
