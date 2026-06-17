import { describe, expect, it } from "vitest";

import {
  getRequestQueueSummary,
  sortTradeRequestsForQueue,
} from "./request-queue";
import type { Item, Profile, TradeCounteroffer, TradeRequest, TradeRequestStatus } from "./types";

const requester = makeProfile("requester", "Persona que propone");
const receiver = makeProfile("receiver", "Persona que recibe");

describe("request queue", () => {
  it("sorts actionable received requests before passive history", () => {
    const requests = [
      makeRequest("completed-old", "completed", { createdAt: "2026-06-01T10:00:00.000Z" }),
      makeRequest("pending-response", "pending", { createdAt: "2026-06-01T09:00:00.000Z" }),
      makeRequest("unread-chat", "accepted", {
        unreadMessageCount: 2,
        lastMessageAt: "2026-06-01T08:00:00.000Z",
      }),
      makeRequest("accepted-new", "accepted", { createdAt: "2026-06-01T11:00:00.000Z" }),
    ];

    expect(sortTradeRequestsForQueue(requests, "received").map((request) => request.id)).toEqual([
      "unread-chat",
      "pending-response",
      "accepted-new",
      "completed-old",
    ]);
  });

  it("puts sent counteroffers that need a response near the top", () => {
    const requests = [
      makeRequest("waiting", "pending", { createdAt: "2026-06-01T12:00:00.000Z" }),
      makeRequest("countered", "countered", {
        counteroffers: [makeCounteroffer("counteroffer-1")],
        createdAt: "2026-06-01T09:00:00.000Z",
      }),
    ];

    expect(sortTradeRequestsForQueue(requests, "sent").map((request) => request.id)).toEqual([
      "countered",
      "waiting",
    ]);
  });

  it("summarizes pending work without double-counting the same request", () => {
    const requests = [
      makeRequest("pending-unread", "pending", { unreadMessageCount: 3 }),
      makeRequest("accepted", "accepted"),
      makeRequest("countered", "countered", {
        counteroffers: [makeCounteroffer("counteroffer-1")],
      }),
    ];

    expect(getRequestQueueSummary(requests, receiver.id)).toEqual({
      pendingReceivedCount: 1,
      unreadMessageCount: 3,
      activeNegotiationsCount: 1,
      needsAttentionCount: 1,
    });
  });
});

function makeProfile(id: string, displayName: string): Profile {
  return {
    id,
    displayName,
    city: "Guadalajara",
    state: "Jalisco",
    country: "Mexico",
    phoneVerified: false,
    emailVerified: true,
    ratingAvg: 0,
    ratingCount: 0,
    completedTradesCount: 0,
    publishedItemsCount: 1,
    memberSince: "2026-06-01T00:00:00.000Z",
  };
}

function makeItem(id: string): Item {
  return {
    id,
    ownerId: requester.id,
    title: `Articulo ${id}`,
    description: "Articulo de prueba con descripcion suficiente.",
    knownDefects: "Sin detalles",
    condition: "used_good",
    category: {
      id: "cat-test",
      name: "Prueba",
      slug: "prueba",
    },
    city: "Guadalajara",
    state: "Jalisco",
    country: "Mexico",
    acceptsMultipleItems: true,
    acceptsOtherCities: false,
    publicTags: [],
    status: "active",
    moderationStatus: "active",
    photoUrls: [],
    createdAt: "2026-06-01T00:00:00.000Z",
  };
}

function makeCounteroffer(id: string): TradeCounteroffer {
  return {
    id,
    tradeRequestId: "request",
    createdBy: receiver,
    requestedItems: [makeItem("requested-counter")],
    offeredItems: [makeItem("offered-counter")],
    status: "pending",
    createdAt: "2026-06-01T00:00:00.000Z",
  };
}

function makeRequest(
  id: string,
  status: TradeRequestStatus,
  overrides: Partial<TradeRequest> = {},
): TradeRequest {
  return {
    id,
    requester,
    receiver,
    requestedItem: makeItem(`${id}-requested`),
    offeredItems: [makeItem(`${id}-offered`)],
    counteroffers: [],
    status,
    requesterCitySnapshot: requester.city,
    requesterStateSnapshot: requester.state,
    receiverCitySnapshot: receiver.city,
    receiverStateSnapshot: receiver.state,
    isCrossCity: false,
    completionConfirmations: [],
    createdAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}
