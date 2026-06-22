export type Profile = {
  id: string;
  displayName: string;
  avatarUrl?: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  bio?: string;
  phoneVerified: boolean;
  phoneLast4?: string;
  phoneVerifiedAt?: string;
  emailVerified: boolean;
  ratingAvg: number;
  ratingCount: number;
  completedTradesCount: number;
  publishedItemsCount: number;
  isAdmin?: boolean;
  isBanned?: boolean;
  onboardingCompletedAt?: string;
  memberSince: string;
};

export type ItemCondition =
  | "new"
  | "like_new"
  | "used_good"
  | "used_with_details"
  | "works_with_issues"
  | "for_repair"
  | "not_working_parts";

export type ItemStatus =
  | "draft"
  | "active"
  | "paused"
  | "reserved"
  | "traded"
  | "deleted"
  | "hidden_by_admin";

export type ValueRange =
  | "under_500"
  | "500_1500"
  | "1500_3000"
  | "3000_7000"
  | "7000_15000"
  | "over_15000"
  | "prefer_not_to_say";

export type Category = {
  id: string;
  name: string;
  slug: string;
  isProhibited?: boolean;
};

export type Tag = {
  id: string;
  name: string;
  slug: string;
};

export type Item = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  knownDefects: string;
  condition: ItemCondition;
  category: Category;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  approximateZone?: string;
  approximateValueRange?: ValueRange;
  acceptsMultipleItems: boolean;
  acceptsOtherCities: boolean;
  publicPreferences?: string;
  publicTags: Tag[];
  privateInterestTags?: Tag[];
  status: ItemStatus;
  moderationStatus: "pending" | "active" | "flagged" | "hidden_by_admin" | "rejected";
  photoUrls: string[];
  viewCount?: number;
  createdAt: string;
};

export type TradeRequestStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "countered"
  | "cancelled"
  | "expired"
  | "completed"
  | "reported";

export type TradeRequest = {
  id: string;
  requester: Profile;
  receiver: Profile;
  requestedItem: Item;
  offeredItems: Item[];
  counteroffers: TradeCounteroffer[];
  message?: string;
  status: TradeRequestStatus;
  rejectionReason?: string;
  requesterCitySnapshot: string;
  requesterStateSnapshot: string;
  receiverCitySnapshot: string;
  receiverStateSnapshot: string;
  isCrossCity: boolean;
  completionConfirmations: TradeCompletionConfirmation[];
  lastMessageAt?: string;
  lastMessagePreview?: string;
  unreadMessageCount?: number;
  currentUserRating?: TradeRating | null;
  createdAt: string;
};

export type TradeCounterofferStatus = "pending" | "accepted" | "rejected" | "cancelled";

export type TradeCounteroffer = {
  id: string;
  tradeRequestId: string;
  createdBy: Profile;
  requestedItems: Item[];
  offeredItems: Item[];
  message?: string;
  status: TradeCounterofferStatus;
  createdAt: string;
};

export type TradeCompletionConfirmation = {
  userId: string;
  confirmedAt: string;
};

export type TradeRating = {
  tradeRequestId: string;
  reviewerId: string;
  reviewedId: string;
  rating: number;
  itemDescriptionRating?: number;
  communicationRating?: number;
  fairExchangeRating?: number;
  reliabilityRating?: number;
  reviewTags: string[];
  comment?: string;
  itemMatchedDescription?: boolean;
  userWasReliable?: boolean;
  createdAt: string;
};

export type ProfileReview = {
  id: string;
  tradeRequestId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatarUrl?: string;
  rating: number;
  itemDescriptionRating?: number;
  communicationRating?: number;
  fairExchangeRating?: number;
  reliabilityRating?: number;
  reviewTags: string[];
  comment?: string;
  itemMatchedDescription?: boolean;
  userWasReliable?: boolean;
  createdAt: string;
};

export type NotificationType =
  | "trade_request_received"
  | "trade_request_accepted"
  | "trade_request_rejected"
  | "trade_request_cancelled"
  | "message_received"
  | "trade_completion_confirmed"
  | "trade_completed"
  | "item_interest_match"
  | "item_view_summary"
  | "rating_received";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  href: string;
  readAt?: string;
  seenAt?: string;
  createdAt: string;
};

export type ReportReason =
  | "prohibited_item"
  | "false_information"
  | "suspicious_user"
  | "possible_scam"
  | "harassment"
  | "stolen_item"
  | "misleading_photos"
  | "other";

export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export type DataDeletionRequestStatus = "open" | "reviewing" | "completed" | "cancelled";

export type DataDeletionRequest = {
  id: string;
  userId?: string;
  userName?: string;
  email: string;
  provider: "email" | "google" | "facebook" | "other";
  details?: string;
  status: DataDeletionRequestStatus;
  adminNotes?: string;
  completedAt?: string;
  createdAt: string;
};

export type AdminModerationActionName =
  | "hide_item"
  | "restore_item"
  | "approve_item"
  | "reject_item"
  | "ban_user"
  | "unban_user"
  | "review_report"
  | "resolve_report"
  | "dismiss_report"
  | "update_report_notes";

export type ModerationReport = {
  id: string;
  reporterId: string;
  reporterName: string;
  reportedUserId?: string;
  reportedUserName?: string;
  reportedItemId?: string;
  reportedItemTitle?: string;
  tradeRequestId?: string;
  reason: ReportReason;
  details?: string;
  adminNotes?: string;
  status: ReportStatus;
  createdAt: string;
};

export type AdminModerationAction = {
  id: string;
  action: AdminModerationActionName;
  adminId?: string;
  adminName: string;
  reportId?: string;
  targetUserId?: string;
  targetUserName?: string;
  targetItemId?: string;
  targetItemTitle?: string;
  previousItemStatus?: string;
  nextItemStatus?: string;
  previousItemModerationStatus?: string;
  nextItemModerationStatus?: string;
  previousUserBanned?: boolean;
  nextUserBanned?: boolean;
  note?: string;
  createdAt: string;
};

export type ItemModerationReviewStatus =
  | "open"
  | "reviewing"
  | "approved"
  | "rejected"
  | "dismissed";

export type ItemModerationReview = {
  id: string;
  item: Item;
  owner: Profile;
  openedBy?: Profile;
  status: ItemModerationReviewStatus;
  reason: string;
  adminNotes?: string;
  reviewedBy?: Profile;
  reviewedAt?: string;
  createdAt: string;
};

export type MatchSignal = {
  label: string;
  points: number;
};

export type MatchScore = {
  score: number;
  signals: MatchSignal[];
};
