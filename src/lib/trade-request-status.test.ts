import { describe, expect, it } from "vitest";

import { getTradeRequestStatusMeta } from "./trade-request-status";

describe("trade request status presentation", () => {
  it("marks cancelled and rejected requests as danger states", () => {
    expect(getTradeRequestStatusMeta("cancelled")).toMatchObject({
      label: "Cancelada",
      tone: "danger",
    });
    expect(getTradeRequestStatusMeta("rejected").tone).toBe("danger");
  });

  it("distinguishes active, successful and waiting states", () => {
    expect(getTradeRequestStatusMeta("accepted").tone).toBe("active");
    expect(getTradeRequestStatusMeta("completed").tone).toBe("success");
    expect(getTradeRequestStatusMeta("pending").tone).toBe("warning");
    expect(getTradeRequestStatusMeta("expired").tone).toBe("neutral");
  });
});
