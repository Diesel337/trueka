import type { TradeRequest } from "./types";

export type RequestDirection = "received" | "sent";

export type RequestQueueSummary = {
  pendingReceivedCount: number;
  unreadMessageCount: number;
  activeNegotiationsCount: number;
  pendingRatingCount: number;
  needsAttentionCount: number;
};

export function sortTradeRequestsForQueue(
  requests: TradeRequest[],
  direction: RequestDirection,
) {
  return [...requests].sort((first, second) => {
    const firstPriority = getTradeRequestQueuePriority(first, direction);
    const secondPriority = getTradeRequestQueuePriority(second, direction);

    if (firstPriority !== secondPriority) {
      return firstPriority - secondPriority;
    }

    return getRequestActivityTime(second) - getRequestActivityTime(first);
  });
}

export function getRequestQueueSummary(
  requests: TradeRequest[],
  currentUserId: string,
): RequestQueueSummary {
  const uniqueNeedsAttention = new Set<string>();
  let pendingReceivedCount = 0;
  let unreadMessageCount = 0;
  let activeNegotiationsCount = 0;
  let pendingRatingCount = 0;

  for (const request of requests) {
    const direction = getRequestDirection(request, currentUserId);
    const unreadCount = request.unreadMessageCount ?? 0;

    unreadMessageCount += unreadCount;

    if (request.status === "accepted") {
      activeNegotiationsCount += 1;
    }

    if (needsRating(request)) {
      pendingRatingCount += 1;
      uniqueNeedsAttention.add(request.id);
    }

    if (direction === "received" && needsReceivedResponse(request)) {
      pendingReceivedCount += 1;
      uniqueNeedsAttention.add(request.id);
    }

    if (unreadCount > 0) {
      uniqueNeedsAttention.add(request.id);
    }

    if (direction === "sent" && needsCounterofferResponse(request)) {
      uniqueNeedsAttention.add(request.id);
    }
  }

  return {
    pendingReceivedCount,
    unreadMessageCount,
    activeNegotiationsCount,
    pendingRatingCount,
    needsAttentionCount: uniqueNeedsAttention.size,
  };
}

export function getTradeRequestQueuePriority(
  request: TradeRequest,
  direction: RequestDirection,
) {
  if ((request.unreadMessageCount ?? 0) > 0) {
    return 0;
  }

  if (direction === "received" && needsReceivedResponse(request)) {
    return 1;
  }

  if (direction === "sent" && needsCounterofferResponse(request)) {
    return 1;
  }

  if (request.status === "accepted") {
    return 2;
  }

  if (needsRating(request)) {
    return 3;
  }

  if (request.status === "pending" || request.status === "countered") {
    return 4;
  }

  if (request.status === "completed") {
    return 5;
  }

  return 6;
}

function getRequestDirection(request: TradeRequest, currentUserId: string): RequestDirection | null {
  if (request.receiver.id === currentUserId) {
    return "received";
  }

  if (request.requester.id === currentUserId) {
    return "sent";
  }

  return null;
}

function needsReceivedResponse(request: TradeRequest) {
  return request.status === "pending" && !hasPendingCounteroffer(request);
}

function needsCounterofferResponse(request: TradeRequest) {
  return request.status === "countered" && hasPendingCounteroffer(request);
}

function needsRating(request: TradeRequest) {
  return request.status === "completed" && !request.currentUserRating;
}

function hasPendingCounteroffer(request: TradeRequest) {
  return request.counteroffers.some((counteroffer) => counteroffer.status === "pending");
}

function getRequestActivityTime(request: TradeRequest) {
  return new Date(request.lastMessageAt ?? request.createdAt).getTime();
}
