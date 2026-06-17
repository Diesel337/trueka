"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

type LiveRefreshProps = {
  intervalMs: number;
};

export function LiveRefresh({ intervalMs }: LiveRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.hidden || isEditingText()) {
        return;
      }

      router.refresh();
    }, intervalMs);

    return () => window.clearInterval(intervalId);
  }, [intervalMs, router]);

  return null;
}

function isEditingText() {
  const activeElement = document.activeElement;

  if (!(activeElement instanceof HTMLElement)) {
    return false;
  }

  return activeElement.tagName === "INPUT"
    || activeElement.tagName === "TEXTAREA"
    || activeElement.isContentEditable;
}
