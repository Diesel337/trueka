import { describe, expect, it } from "vitest";

import {
  getRateLimitExceededMessage,
  getRateLimitRpcArgs,
  rateLimitRules,
} from "./rate-limits";

describe("rate limit rules", () => {
  it("keeps trade request limits conservative for repeated requests", () => {
    expect(rateLimitRules.tradeRequestCreate.maxEvents).toBe(12);
    expect(rateLimitRules.tradeRequestCreate.windowSeconds).toBe(60 * 60);
    expect(rateLimitRules.tradeRequestCreateForItem.maxEvents).toBe(3);
  });

  it("normalizes rpc arguments and target keys", () => {
    expect(getRateLimitRpcArgs("messageSendInThread", " request-123 ")).toEqual({
      p_action: "message_send_in_thread",
      p_window_seconds: 60,
      p_max_events: 20,
      p_target_key: "request-123",
    });
  });

  it("returns friendly messages for blocked bursts", () => {
    expect(getRateLimitExceededMessage("reportCreate")).toContain("reportes");
  });
});
