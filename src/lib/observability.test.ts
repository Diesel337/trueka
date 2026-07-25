import { describe, expect, it } from "vitest";

import {
  getErrorMessage,
  getPublicDatabaseErrorMessage,
  sanitizeLogContext,
} from "./observability";

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

  it("preserves intentional product messages from database rules", () => {
    expect(
      getPublicDatabaseErrorMessage(
        new Error("Ya tienes demasiadas solicitudes recientes. Intenta mas tarde."),
        "No se pudo enviar la solicitud.",
      ),
    ).toBe("Ya tienes demasiadas solicitudes recientes. Intenta mas tarde.");
  });

  it("hides database implementation details", () => {
    expect(
      getPublicDatabaseErrorMessage(
        new Error("duplicate key value violates unique constraint trade_requests_pkey"),
        "No se pudo enviar la solicitud.",
      ),
    ).toBe("No se pudo enviar la solicitud.");
    expect(
      getPublicDatabaseErrorMessage(
        new Error("relation public.profiles does not exist"),
        "No se pudo guardar el perfil.",
      ),
    ).toBe("No se pudo guardar el perfil.");
  });
});
