import { describe, expect, it } from "vitest";

import { items, profiles } from "./mock-data";
import {
  areSameCity,
  buildTradeRequestNotice,
  canCompleteTradeRequest,
  canUseTradeRequestChat,
  getCrossCityWarning,
  validateTradeRequestDraft,
} from "./trade-rules";

const requester = profiles[1];
const receiver = profiles[0];
const monterreyRequester = profiles[2];
const requestedItem = items[0];
const offeredItem = items[1];

describe("trade request rules", () => {
  it("rejects money, payment, or managed shipping fields", () => {
    const errors = validateTradeRequestDraft({
      requesterId: requester.id,
      receiverId: receiver.id,
      requestedItem,
      offeredItems: [offeredItem],
      unexpectedFields: {
        cash_amount: 300,
        shippingCost: 120,
      },
    });

    expect(errors).toContain("La solicitud de trueque no puede incluir dinero, pagos ni envíos gestionados.");
  });

  it("rejects a request without offered items", () => {
    const errors = validateTradeRequestDraft({
      requesterId: requester.id,
      receiverId: receiver.id,
      requestedItem,
      offeredItems: [],
    });

    expect(errors).toContain("Debes ofrecer al menos un artículo propio.");
  });

  it("rejects requests for the user's own item", () => {
    const errors = validateTradeRequestDraft({
      requesterId: requestedItem.ownerId,
      receiverId: requestedItem.ownerId,
      requestedItem,
      offeredItems: [offeredItem],
    });

    expect(errors).toContain("No puedes proponer trueque por un artículo propio.");
  });

  it("rejects inactive requested items", () => {
    const errors = validateTradeRequestDraft({
      requesterId: requester.id,
      receiverId: receiver.id,
      requestedItem: { ...requestedItem, status: "traded" },
      offeredItems: [offeredItem],
    });

    expect(errors).toContain("El artículo solicitado debe estar activo.");
  });

  it("rejects offered items that do not belong to the requester", () => {
    const errors = validateTradeRequestDraft({
      requesterId: receiver.id,
      receiverId: requester.id,
      requestedItem: offeredItem,
      offeredItems: [offeredItem],
    });

    expect(errors).toContain("Solo puedes ofrecer artículos que sean tuyos.");
  });

  it("rejects blocked user interaction", () => {
    const errors = validateTradeRequestDraft({
      requesterId: requester.id,
      receiverId: receiver.id,
      requestedItem,
      offeredItems: [offeredItem],
      usersAreBlocked: true,
    });

    expect(errors).toContain("No puedes interactuar con un usuario bloqueado.");
  });

  it("only completes trades when all involved items are still available", () => {
    expect(canCompleteTradeRequest([requestedItem, offeredItem])).toBe(true);
    expect(canCompleteTradeRequest([{ ...requestedItem, status: "traded" }, offeredItem])).toBe(false);
  });

  it("enables chat only after a request is accepted", () => {
    expect(canUseTradeRequestChat("pending")).toBe(false);
    expect(canUseTradeRequestChat("accepted")).toBe(true);
    expect(canUseTradeRequestChat("completed")).toBe(true);
    expect(canUseTradeRequestChat("rejected")).toBe(false);
  });

  it("treats Guadalajara metro cities as the same trade zone", () => {
    const guadalajara = { city: "Guadalajara", state: "Jalisco" };
    const metroCities = [
      "Zapopan",
      "Tlaquepaque",
      "San Pedro Tlaquepaque",
      "Tonalá",
      "Tlajomulco",
      "Tlajomulco de Zúñiga",
    ];

    for (const city of metroCities) {
      expect(areSameCity(guadalajara, { city, state: "Jalisco" })).toBe(true);
    }
  });

  it("uses local copy for requests inside the same trade zone", () => {
    expect(buildTradeRequestNotice(receiver, receiver)).toBe("Nueva solicitud de trueque.");
    expect(buildTradeRequestNotice(requester, receiver)).toBe("Nueva solicitud de trueque.");
  });

  it("shows cross-city warning only outside the same trade zone", () => {
    expect(getCrossCityWarning(requester, receiver)).toBeNull();
    expect(getCrossCityWarning(monterreyRequester, receiver)).toContain("Trueka no gestiona envíos ni entregas");
  });
});
