import { describe, expect, it } from "vitest";

import { getErrorMessage, sanitizeLogContext } from "./observability";

describe("observability", () => {
  it("redacts sensitive fields from structured logs", () => {
    expect(
      sanitizeLogContext({
        email: "alguien@example.com",
        phone: "+5213312345678",
        nested: {
          token: "secret-token",
          safe: "visible",
        },
      }),
    ).toEqual({
      email: "[redacted]",
      phone: "[redacted]",
      nested: {
        token: "[redacted]",
        safe: "visible",
      },
    });
  });

  it("normalizes unknown errors", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
    expect(getErrorMessage("plain")).toBe("plain");
    expect(getErrorMessage({})).toBe("Unknown error");
  });
});
