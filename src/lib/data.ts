import { categories as demoCategories, privateInterestTags } from "./constants";
import {
  getMunicipalitiesForFilter,
  getStateForLocationFilter,
  isLocationInFilter,
} from "./mexico-locations";
import { getProtectedMediaUrl, normalizeStoredMediaUrl } from "./media-url";
import { getPostalCodeProximity, normalizePostalCode } from "./postal-code-proximity";
import {
  currentUser as demoCurrentUser,
  getItem as getDemoItem,
  getOwner as getDemoOwner,
  getProfile as getDemoProfile,
  getProfileStats as getDemoProfileStats,
  items as demoItems,
  savedItemIds as demoSavedItemIds,
  profiles as demoProfiles,
  tradeRequests as demoTradeRequests,
} from "./mock-data";
import { hasSupabasePublicConfig } from "./supabase/config";
import { createSupabaseServerClient } from "./supabase/server";
import type {
  Category,
  AdminModerationAction,
  DataDeletionRequest,
  DataDeletionRequestStatus,
  Item,
  ItemModerationReview,
  ModerationReport,
  Notification,
  NotificationType,
  Profile,
  ProfileReview,
  ReportReason,
  ReportStatus,
  Tag,
  TradeCounteroffer,
  TradeCounterofferStatus,
  TradeCompletionConfirmation,
  TradeRating,
  TradeRequest,
} from "./types";

type DataRow = Record<string, unknown>;

const publicProfileColumns = [
  "id",
  "display_name",
  "avatar_url",
  "city",
  "state",
  "country",
  "bio",
  "phone_verified",
  "email_verified",
  "rating_avg",
  "rating_count",
  "completed_trades_count",
  "published_items_count",
  "is_admin",
  "is_banned",
  "created_at",
  "updated_at",
].join(",");

export type ItemsResult = {
  categories: Category[];
  items: Item[];
  ownersById: Record<string, Profile>;
  page: number;
  hasMore: boolean;
};

export type ItemsResultOptions = {
  page?: number;
  pageSize?: number;
};

export type ItemSearchFilters = {
  q?: string;
  state?: string;
  city?: string;
  category?: string;
  condition?: string;
  valueRange?: string;
  acceptsOtherCities?: string;
  postalCode?: string;
  sort?: string;
};

export type ProfileStats = {
  activeItemsCount: number;
  publishedItemsCount: number;
  completedTradesCount: number;
  tradeRate: number;
  totalItemViews: number;
};

export async function getCatalogData() {
  if (!hasSupabasePublicConfig()) {
    return {
      categories: demoCategories,
      tags: privateInterestTags,
    };
  }

  const supabase = await createSupabaseServerClient();
  const [categoriesResult, tagsResult] = await Promise.all([
    supabase
      .from("categories")
      .select("id,name,slug,is_prohibited")
      .eq("is_active", true)
      .order("name"),
    supabase.from("tags").select("id,name,slug").eq("is_active", true).order("name"),
  ]);

  return {
    categories: rows(categoriesResult.data).map(toCategory),
    tags: rows(tagsResult.data).map(toTag),
  };
}

export async function getItemsResult(filters?: ItemSearchFilters, options: ItemsResultOptions = {}) {
  const pageSize = Math.min(Math.max(Math.trunc(options.pageSize ?? 24), 1), 48);
  const page = Math.max(Math.trunc(options.page ?? 1), 1);

  if (!hasSupabasePublicConfig()) {
    const query = filters?.q?.trim().toLocaleLowerCase("es-MX") ?? "";
    const city = filters?.city?.trim() ?? "";
    const state = filters?.state?.trim() || getStateForLocationFilter(city) || "";
    const category = filters?.category?.trim() ?? "";
    const condition = filters?.condition?.trim() ?? "";
    const valueRange = filters?.valueRange?.trim() ?? "";
    const acceptsOtherCities = filters?.acceptsOtherCities === "true";
    const postalCode = normalizePostalCode(filters?.postalCode);
    const matchingItems = sortItemsForExplore(demoItems.filter((item) => {
      const matchesQuery =
        !query
        || item.title.toLocaleLowerCase("es-MX").includes(query)
        || item.description.toLocaleLowerCase("es-MX").includes(query)
        || item.knownDefects.toLocaleLowerCase("es-MX").includes(query);
      const matchesLocation = isLocationInFilter(
        { state: item.state, municipality: item.city },
        { state, municipality: city },
      );
      const matchesCategory = !category || item.category.slug === category;
      const matchesCondition = !condition || item.condition === condition;
      const matchesValueRange = !valueRange || item.approximateValueRange === valueRange;
      const matchesOtherCities = !acceptsOtherCities || item.acceptsOtherCities;

      return item.status === "active"
        && matchesQuery
        && matchesLocation
        && matchesCategory
        && matchesCondition
        && matchesValueRange
        && matchesOtherCities;
    }), filters?.sort, postalCode);
    const offset = (page - 1) * pageSize;
    const items = matchingItems.slice(offset, offset + pageSize);

    return {
      categories: demoCategories,
      items,
      ownersById: buildOwnersById(items, demoProfiles),
      page,
      hasMore: matchingItems.length > offset + pageSize,
    };
  }

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("items")
    .select(
      `
      *,
      category:categories(id,name,slug,is_prohibited),
      item_photos(public_url,storage_path,sort_order),
      item_public_tags(tags(id,name,slug))
    `,
    )
    .eq("status", "active")
    .eq("moderation_status", "active");

  if (filters?.q) {
    const text = normalizeItemSearchText(filters.q);

    if (text) {
      query = query.or(`title.ilike.%${text}%,description.ilike.%${text}%,known_defects.ilike.%${text}%`);
    }
  }

  const cityFilter = filters?.city?.trim() ?? "";
  const stateFilter = filters?.state?.trim() || getStateForLocationFilter(cityFilter);

  if (stateFilter) {
    query = query.eq("state", stateFilter);
  }

  if (cityFilter) {
    query = query.in("city", getMunicipalitiesForFilter(stateFilter, cityFilter));
  }

  if (filters?.category) {
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", filters.category)
      .maybeSingle();

    const categoryId = row(category).id;

    if (typeof categoryId === "string") {
      query = query.eq("category_id", categoryId);
    }
  }

  if (filters?.condition) {
    query = query.eq("condition", filters.condition);
  }

  if (filters?.valueRange) {
    query = query.eq("approximate_value_range", filters.valueRange);
  }

  if (filters?.acceptsOtherCities === "true") {
    query = query.eq("accepts_other_cities", true);
  }

  query = applyItemSort(query, filters?.sort);
  const offset = (page - 1) * pageSize;
  query = query.range(offset, offset + pageSize);

  const [itemsResult, catalog] = await Promise.all([
    query,
    getCatalogData(),
  ]);
  const resultRows = rows(itemsResult.data);
  const items = resultRows.slice(0, pageSize).map(toItem);
  const visibleItems = sortItemsForExplore(items, filters?.sort, filters?.postalCode);
  const owners = await getProfilesByIds(visibleItems.map((item) => item.ownerId));

  return {
    categories: catalog.categories,
    items: visibleItems,
    ownersById: buildOwnersById(visibleItems, owners),
    page,
    hasMore: resultRows.length > pageSize,
  };
}

export function normalizeItemSearchText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function sortItemsForExplore(items: Item[], sort = "newest", viewerPostalCode?: string) {
  const postalCode = normalizePostalCode(viewerPostalCode);

  return [...items].sort((first, second) => {
    if (sort === "nearby" && postalCode) {
      const firstProximity = getPostalCodeProximity(first.postalCode, postalCode);
      const secondProximity = getPostalCodeProximity(second.postalCode, postalCode);

      if (firstProximity.rank !== secondProximity.rank) {
        return firstProximity.rank - secondProximity.rank;
      }

      if (firstProximity.score !== secondProximity.score) {
        return secondProximity.score - firstProximity.score;
      }

      return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
    }

    if (sort === "oldest") {
      return new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime();
    }

    if (sort === "name_asc") {
      return first.title.localeCompare(second.title, "es-MX");
    }

    if (sort === "name_desc") {
      return second.title.localeCompare(first.title, "es-MX");
    }

    return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
  });
}

function applyItemSort<T extends { order: (column: string, options?: { ascending?: boolean }) => T }>(
  query: T,
  sort = "newest",
) {
  if (sort === "oldest") {
    return query.order("created_at", { ascending: true });
  }

  if (sort === "name_asc") {
    return query.order("title", { ascending: true }).order("created_at", { ascending: false });
  }

  if (sort === "name_desc") {
    return query.order("title", { ascending: false }).order("created_at", { ascending: false });
  }

  return query.order("created_at", { ascending: false });
}

export async function getItemDetail(id: string) {
  if (!hasSupabasePublicConfig()) {
    const item = getDemoItem(id);

    if (!item) {
      return null;
    }

    return {
      item,
      owner: getDemoOwner(item),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("items")
    .select(
      `
      *,
      category:categories(id,name,slug,is_prohibited),
      item_photos(public_url,storage_path,sort_order),
      item_public_tags(tags(id,name,slug))
    `,
    )
    .eq("id", id)
    .maybeSingle();

  const itemRow = row(data);

  if (!itemRow.id) {
    return null;
  }

  const item = toItem(itemRow);

  const owner = await getProfileById(item.ownerId);

  if (!owner) {
    return null;
  }

  return { item, owner };
}

export async function getOwnItemEditData(id: string) {
  const profile = await getCurrentProfile();

  if (!profile) {
    return null;
  }

  if (!hasSupabasePublicConfig()) {
    const item = getDemoItem(id);

    if (!item || item.ownerId !== profile.id) {
      return null;
    }

    return {
      item,
      publicTagSlugs: item.publicTags.map((tag) => tag.slug),
      privateInterestTagSlugs: item.privateInterestTags?.map((tag) => tag.slug) ?? [],
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("items")
    .select(
      `
      *,
      category:categories(id,name,slug,is_prohibited),
      item_photos(public_url,storage_path,sort_order),
      item_public_tags(tags(id,name,slug)),
      item_private_interest_tags(tags(id,name,slug))
    `,
    )
    .eq("id", id)
    .maybeSingle();
  const itemRow = row(data);

  if (!itemRow.id || getString(itemRow, "owner_id") !== profile.id) {
    return null;
  }

  const item = toItem(itemRow);
  const publicTagSlugs = rows(itemRow.item_public_tags)
    .map((tagRow) => toTag(row(tagRow.tags)).slug)
    .filter(Boolean);
  const privateInterestTagSlugs = rows(itemRow.item_private_interest_tags)
    .map((tagRow) => toTag(row(tagRow.tags)).slug)
    .filter(Boolean);

  return {
    item,
    publicTagSlugs,
    privateInterestTagSlugs,
  };
}

export async function getCurrentProfile() {
  if (!hasSupabasePublicConfig()) {
    return demoCurrentUser;
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  const userId = user?.id;

  if (!userId) {
    return null;
  }

  const { data: privateProfileData, error: privateProfileError } = await supabase
    .rpc("get_my_profile")
    .maybeSingle();
  let profileRow = row(privateProfileData);

  if (privateProfileError) {
    const { data: legacyProfileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    profileRow = row(legacyProfileData);
  }

  const profile = profileRow.id ? toProfile(profileRow) : null;

  if (!profile) {
    return null;
  }

  const authEmailVerified = Boolean(
    user.email_confirmed_at
      || user.confirmed_at
      || isTruthyMetadataValue(user.user_metadata?.email_verified)
      || isTruthyMetadataValue(user.app_metadata?.email_verified),
  );

  if (authEmailVerified && !profile.emailVerified) {
    await supabase.rpc("sync_my_email_verification");

    return {
      ...profile,
      emailVerified: true,
    };
  }

  return profile;
}

export async function getCurrentProfilePrivateInterestTags() {
  if (!hasSupabasePublicConfig()) {
    return privateInterestTags.slice(0, 4);
  }

  const userId = await getCurrentUserId();

  if (!userId) {
    return [] as Tag[];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profile_private_interest_tags")
    .select("tags(id,name,slug)")
    .eq("profile_id", userId);

  if (error) {
    return [] as Tag[];
  }

  return rows(data)
    .map((entry) => toTag(row(entry.tags)))
    .filter((tag) => tag.id);
}

export async function getBlockedProfilesForCurrentUser() {
  if (!hasSupabasePublicConfig()) {
    return [] as Profile[];
  }

  const blockedIds = await getBlockedProfileIdsForCurrentUser();

  const profiles = await getProfilesByIds(blockedIds);
  const profilesById = Object.fromEntries(profiles.map((profile) => [profile.id, profile]));

  return blockedIds
    .map((id) => profilesById[id])
    .filter((profile): profile is Profile => Boolean(profile));
}

async function getBlockedProfileIdsForCurrentUser() {
  if (!hasSupabasePublicConfig()) {
    return [] as string[];
  }

  const userId = await getCurrentUserId();

  if (!userId) {
    return [] as string[];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("blocks")
    .select("blocked_id,created_at")
    .eq("blocker_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return [] as string[];
  }

  return rows(data)
    .map((block) => getString(block, "blocked_id"))
    .filter(Boolean);
}

export async function getProfileById(id: string) {
  if (!hasSupabasePublicConfig()) {
    return getDemoProfile(id) ?? null;
  }

  const profiles = await getProfilesByIds([id]);

  return profiles[0] ?? null;
}

export async function getProfilePageData(id: string) {
  const profile = await getProfileById(id);

  if (!profile) {
    return null;
  }

  if (!hasSupabasePublicConfig()) {
    const stats = getDemoProfileStats(profile.id);
    const activeItems = demoItems.filter(
      (item) =>
        item.ownerId === profile.id
        && item.status === "active"
        && item.moderationStatus === "active",
    );

    return {
      profile,
      stats: {
        ...stats,
        totalItemViews: activeItems.reduce((sum, item) => sum + (item.viewCount ?? 0), 0),
      },
      activeItems,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: itemData } = await supabase
    .from("items")
    .select(
      `
      *,
      category:categories(id,name,slug,is_prohibited),
      item_photos(public_url,storage_path,sort_order),
      item_public_tags(tags(id,name,slug))
    `,
    )
    .eq("owner_id", profile.id)
    .eq("status", "active")
    .eq("moderation_status", "active")
    .order("created_at", { ascending: false })
    .limit(24);
  const activeItems = rows(itemData).map(toItem);
  const viewCounts = await getItemViewCounts(activeItems.map((item) => item.id));
  const activeItemsWithViews = activeItems.map((item) => ({
    ...item,
    viewCount: viewCounts[item.id] ?? 0,
  }));
  const stats = buildProfileStats(
    profile,
    activeItemsWithViews.length,
    activeItemsWithViews.reduce((sum, item) => sum + (item.viewCount ?? 0), 0),
  );

  return { profile, stats, activeItems: activeItemsWithViews };
}

export async function getProfileReviews(profileId: string, limit = 6) {
  if (!hasSupabasePublicConfig()) {
    return [] as ProfileReview[];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ratings")
    .select(
      "id,trade_request_id,reviewer_id,rating,item_description_rating,communication_rating,fair_exchange_rating,reliability_rating,review_tags,comment,item_matched_description,user_was_reliable,created_at,reviewer:profiles!ratings_reviewer_id_fkey(id,display_name,avatar_url)",
    )
    .eq("reviewed_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return [] as ProfileReview[];
  }

  return rows(data).map(toProfileReview);
}

export async function getOwnProfilePageData() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return null;
  }

  if (!hasSupabasePublicConfig()) {
    const items = demoItems.filter(
      (item) =>
        item.ownerId === profile.id
        && item.status !== "deleted"
        && item.status !== "hidden_by_admin",
    );
    const activeItemsCount = items.filter(
      (item) => item.status === "active" && item.moderationStatus === "active",
    ).length;
    const stats = buildProfileStats(
      profile,
      activeItemsCount,
      items.reduce((sum, item) => sum + (item.viewCount ?? 0), 0),
    );

    return { profile, stats, items };
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("items")
    .select(
      `
      *,
      category:categories(id,name,slug,is_prohibited),
      item_photos(public_url,storage_path,sort_order),
      item_public_tags(tags(id,name,slug))
    `,
    )
    .eq("owner_id", profile.id)
    .neq("status", "deleted")
    .neq("status", "hidden_by_admin")
    .order("created_at", { ascending: false });

  const items = rows(data).map(toItem);
  const viewCounts = await getItemViewCounts(items.map((item) => item.id));
  const itemsWithViews = items.map((item) => ({
    ...item,
    viewCount: viewCounts[item.id] ?? 0,
  }));
  const activeItemsCount = itemsWithViews.filter(
    (item) => item.status === "active" && item.moderationStatus === "active",
  ).length;
  const stats = buildProfileStats(
    profile,
    activeItemsCount,
    itemsWithViews.reduce((sum, item) => sum + (item.viewCount ?? 0), 0),
  );

  return { profile, stats, items: itemsWithViews };
}

export async function getOwnActiveItems() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return {
      profile: null,
      items: [] as Item[],
    };
  }

  if (!hasSupabasePublicConfig()) {
    return {
      profile,
      items: demoItems.filter(
        (item) =>
          item.ownerId === profile.id
          && item.status === "active"
          && item.moderationStatus === "active",
      ),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("items")
    .select(
      `
      *,
      category:categories(id,name,slug,is_prohibited),
      item_photos(public_url,storage_path,sort_order),
      item_public_tags(tags(id,name,slug)),
      item_private_interest_tags(tags(id,name,slug))
    `,
    )
    .eq("owner_id", profile.id)
    .eq("status", "active")
    .eq("moderation_status", "active")
    .order("created_at", { ascending: false });

  return {
    profile,
    items: rows(data).map(toItem),
  };
}

export async function getSavedItemIdsForCurrentUser() {
  if (!hasSupabasePublicConfig()) {
    return demoSavedItemIds;
  }

  const userId = await getCurrentUserId();

  if (!userId) {
    return [] as string[];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("saved_items")
    .select("item_id")
    .eq("user_id", userId);

  if (error) {
    return [] as string[];
  }

  return rows(data).map((entry) => getString(entry, "item_id")).filter(Boolean);
}

export async function getAdminReports() {
  if (!hasSupabasePublicConfig()) {
    return [] as ModerationReport[];
  }

  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.isAdmin) {
    return [] as ModerationReport[];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("reports")
    .select("id,reporter_id,reported_user_id,reported_item_id,trade_request_id,reason,details,admin_notes,status,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return [] as ModerationReport[];
  }

  const reportRows = rows(data);
  const profileIds = reportRows.flatMap((report) => [
    getString(report, "reporter_id"),
    getOptionalString(report, "reported_user_id"),
  ]).filter((id): id is string => Boolean(id));
  const itemIds = reportRows
    .map((report) => getOptionalString(report, "reported_item_id"))
    .filter((id): id is string => Boolean(id));
  const [profiles, items] = await Promise.all([
    getProfilesByIds(profileIds),
    getItemsByIds(itemIds),
  ]);
  const profilesById = Object.fromEntries(profiles.map((profile) => [profile.id, profile]));
  const itemsById = Object.fromEntries(items.map((item) => [item.id, item]));
  const statusOrder: Record<ReportStatus, number> = {
    open: 0,
    reviewing: 1,
    resolved: 2,
    dismissed: 3,
  };

  return reportRows
    .map((report): ModerationReport => {
      const reporterId = getString(report, "reporter_id");
      const reportedUserId = getOptionalString(report, "reported_user_id");
      const reportedItemId = getOptionalString(report, "reported_item_id");

      return {
        id: getString(report, "id"),
        reporterId,
        reporterName: profilesById[reporterId]?.displayName ?? "Usuario",
        reportedUserId,
        reportedUserName: reportedUserId ? profilesById[reportedUserId]?.displayName : undefined,
        reportedItemId,
        reportedItemTitle: reportedItemId ? itemsById[reportedItemId]?.title : undefined,
        tradeRequestId: getOptionalString(report, "trade_request_id"),
        reason: getString(report, "reason") as ReportReason,
        details: getOptionalString(report, "details"),
        adminNotes: getOptionalString(report, "admin_notes"),
        status: getString(report, "status") as ReportStatus,
        createdAt: getString(report, "created_at"),
      };
    })
    .sort((first, second) => {
      const statusDelta = statusOrder[first.status] - statusOrder[second.status];

      if (statusDelta !== 0) {
        return statusDelta;
      }

      return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
    });
}

export async function getAdminDataDeletionRequests() {
  if (!hasSupabasePublicConfig()) {
    return [] as DataDeletionRequest[];
  }

  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.isAdmin) {
    return [] as DataDeletionRequest[];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("data_deletion_requests")
    .select("id,user_id,email,provider,details,status,admin_notes,completed_at,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return [] as DataDeletionRequest[];
  }

  const requestRows = rows(data);
  const profileIds = requestRows
    .map((request) => getOptionalString(request, "user_id"))
    .filter((id): id is string => Boolean(id));
  const profiles = await getProfilesByIds(profileIds);
  const profilesById = Object.fromEntries(profiles.map((profile) => [profile.id, profile]));
  const statusOrder: Record<DataDeletionRequestStatus, number> = {
    open: 0,
    reviewing: 1,
    completed: 2,
    cancelled: 3,
  };

  return requestRows
    .map((request): DataDeletionRequest => {
      const userId = getOptionalString(request, "user_id");

      return {
        id: getString(request, "id"),
        userId,
        userName: userId ? profilesById[userId]?.displayName : undefined,
        email: getString(request, "email"),
        provider: getString(request, "provider") as DataDeletionRequest["provider"],
        details: getOptionalString(request, "details"),
        status: getString(request, "status") as DataDeletionRequestStatus,
        adminNotes: getOptionalString(request, "admin_notes"),
        completedAt: getOptionalString(request, "completed_at"),
        createdAt: getString(request, "created_at"),
      };
    })
    .sort((first, second) => {
      const statusDelta = statusOrder[first.status] - statusOrder[second.status];

      if (statusDelta !== 0) {
        return statusDelta;
      }

      return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
    });
}

export async function getAdminHiddenItems() {
  if (!hasSupabasePublicConfig()) {
    return [] as Item[];
  }

  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.isAdmin) {
    return [] as Item[];
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("items")
    .select(
      `
      *,
      category:categories(id,name,slug,is_prohibited),
      item_photos(public_url,storage_path,sort_order),
      item_public_tags(tags(id,name,slug))
    `,
    )
    .or("status.eq.hidden_by_admin,moderation_status.eq.hidden_by_admin")
    .order("updated_at", { ascending: false })
    .limit(50);

  return rows(data).map(toItem);
}

export async function getAdminItemModerationReviews() {
  if (!hasSupabasePublicConfig()) {
    return [] as ItemModerationReview[];
  }

  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.isAdmin) {
    return [] as ItemModerationReview[];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("item_moderation_reviews")
    .select("id,item_id,opened_by,status,reason,admin_notes,reviewed_by,reviewed_at,created_at")
    .in("status", ["open", "reviewing"])
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return [] as ItemModerationReview[];
  }

  const reviewRows = rows(data);
  const itemIds = reviewRows
    .map((review) => getString(review, "item_id"))
    .filter(Boolean);
  const items = await getItemsByIds(itemIds);
  const itemById = Object.fromEntries(items.map((item) => [item.id, item]));
  const ownerIds = items.map((item) => item.ownerId);
  const profileIds = reviewRows.flatMap((review) => [
    getOptionalString(review, "opened_by"),
    getOptionalString(review, "reviewed_by"),
  ]).filter((id): id is string => Boolean(id));
  const profiles = await getProfilesByIds([...ownerIds, ...profileIds]);
  const profileById = Object.fromEntries(profiles.map((profile) => [profile.id, profile]));

  return reviewRows.flatMap((review): ItemModerationReview[] => {
    const item = itemById[getString(review, "item_id")];
    const owner = item ? profileById[item.ownerId] : null;

    if (!item || !owner) {
      return [];
    }

    const openedById = getOptionalString(review, "opened_by");
    const reviewedById = getOptionalString(review, "reviewed_by");

    return [{
      id: getString(review, "id"),
      item,
      owner,
      openedBy: openedById ? profileById[openedById] : undefined,
      status: getString(review, "status") as ItemModerationReview["status"],
      reason: getString(review, "reason"),
      adminNotes: getOptionalString(review, "admin_notes"),
      reviewedBy: reviewedById ? profileById[reviewedById] : undefined,
      reviewedAt: getOptionalString(review, "reviewed_at"),
      createdAt: getString(review, "created_at"),
    }];
  });
}

export async function getAdminBannedProfiles() {
  if (!hasSupabasePublicConfig()) {
    return [] as Profile[];
  }

  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.isAdmin) {
    return [] as Profile[];
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select(publicProfileColumns)
    .eq("is_banned", true)
    .order("updated_at", { ascending: false })
    .limit(50);

  return rows(data).map(toProfile);
}

export async function getAdminModerationActions(limit = 12) {
  if (!hasSupabasePublicConfig()) {
    return [] as AdminModerationAction[];
  }

  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.isAdmin) {
    return [] as AdminModerationAction[];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("admin_moderation_actions")
    .select(
      "id,admin_id,action,report_id,target_user_id,target_item_id,previous_item_status,next_item_status,previous_item_moderation_status,next_item_moderation_status,previous_user_banned,next_user_banned,note,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return [] as AdminModerationAction[];
  }

  const actionRows = rows(data);
  const profileIds = actionRows.flatMap((action) => [
    getOptionalString(action, "admin_id"),
    getOptionalString(action, "target_user_id"),
  ]).filter((id): id is string => Boolean(id));
  const itemIds = actionRows
    .map((action) => getOptionalString(action, "target_item_id"))
    .filter((id): id is string => Boolean(id));
  const [profiles, items] = await Promise.all([
    getProfilesByIds(profileIds),
    getItemsByIds(itemIds),
  ]);
  const profilesById = Object.fromEntries(profiles.map((profile) => [profile.id, profile]));
  const itemsById = Object.fromEntries(items.map((item) => [item.id, item]));

  return actionRows.map((action): AdminModerationAction => {
    const adminId = getOptionalString(action, "admin_id");
    const targetUserId = getOptionalString(action, "target_user_id");
    const targetItemId = getOptionalString(action, "target_item_id");

    return {
      id: getString(action, "id"),
      action: getString(action, "action") as AdminModerationAction["action"],
      adminId,
      adminName: adminId ? profilesById[adminId]?.displayName ?? "Admin" : "Admin",
      reportId: getOptionalString(action, "report_id"),
      targetUserId,
      targetUserName: targetUserId ? profilesById[targetUserId]?.displayName : undefined,
      targetItemId,
      targetItemTitle: targetItemId ? itemsById[targetItemId]?.title : undefined,
      previousItemStatus: getOptionalString(action, "previous_item_status"),
      nextItemStatus: getOptionalString(action, "next_item_status"),
      previousItemModerationStatus: getOptionalString(action, "previous_item_moderation_status"),
      nextItemModerationStatus: getOptionalString(action, "next_item_moderation_status"),
      previousUserBanned: getOptionalBoolean(action, "previous_user_banned"),
      nextUserBanned: getOptionalBoolean(action, "next_user_banned"),
      note: getOptionalString(action, "note"),
      createdAt: getString(action, "created_at"),
    };
  });
}

export async function getPendingReceivedRequestCount(profileId?: string) {
  if (!hasSupabasePublicConfig()) {
    const currentId = profileId ?? demoCurrentUser.id;

    return demoTradeRequests.filter(
      (request) =>
        request.receiver.id === currentId
        && ["pending", "countered"].includes(request.status),
    ).length;
  }

  const userId = profileId ?? await getCurrentUserId();

  if (!userId) {
    return 0;
  }

  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("trade_requests")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", userId)
    .in("status", ["pending", "countered"]);

  return count ?? 0;
}

export async function getUnreadNotificationCount(profileId?: string) {
  if (!hasSupabasePublicConfig()) {
    return getPendingReceivedRequestCount(profileId);
  }

  const userId = profileId ?? await getCurrentUserId();

  if (!userId) {
    return 0;
  }

  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .is("seen_at", null);

  if (error) {
    const fallback = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", userId)
      .is("read_at", null);

    if (fallback.error) {
      return getPendingReceivedRequestCount(userId);
    }

    return fallback.count ?? 0;
  }

  return count ?? 0;
}

export async function getNotificationsForCurrentUser(limit = 8) {
  if (!hasSupabasePublicConfig()) {
    return buildTradeRequestNotifications(demoTradeRequests, demoCurrentUser.id, limit);
  }

  const userId = await getCurrentUserId();

  if (!userId) {
    return [] as Notification[];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id,type,title,body,href,read_at,seen_at,created_at")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    const fallback = await supabase
      .from("notifications")
      .select("id,type,title,body,href,read_at,created_at")
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (fallback.error) {
      return buildTradeRequestNotifications(await getTradeRequestsForCurrentUser(), userId, limit);
    }

    return rows(fallback.data).map(toNotification);
  }

  return rows(data).map(toNotification);
}

export async function getTradeRequestsForCurrentUser() {
  if (!hasSupabasePublicConfig()) {
    return demoTradeRequests;
  }

  const profile = await getCurrentProfile();

  if (!profile) {
    return [] as TradeRequest[];
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("trade_requests")
    .select(
      `
      *,
      trade_request_offered_items(item_id),
      trade_counteroffers(
        id,
        trade_request_id,
        created_by,
        message,
        status,
        created_at,
        trade_counteroffer_items(item_id,role)
      )
    `,
    )
    .or(`requester_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
    .order("created_at", { ascending: false });
  const requestRows = rows(data);
  const requestedItemIds = requestRows
    .map((request) => getString(request, "requested_item_id"))
    .filter(Boolean);
  const offeredItemIds = requestRows.flatMap((request) =>
    rows(request.trade_request_offered_items).map((offered) => getString(offered, "item_id")).filter(Boolean),
  );
  const counterofferRows = requestRows.flatMap((request) => rows(request.trade_counteroffers));
  const counterofferItemIds = counterofferRows.flatMap((counteroffer) =>
    rows(counteroffer.trade_counteroffer_items).map((item) => getString(item, "item_id")).filter(Boolean),
  );
  const profileIds = requestRows.flatMap((request) => [
    getString(request, "requester_id"),
    getString(request, "receiver_id"),
    ...rows(request.trade_counteroffers).map((counteroffer) => getString(counteroffer, "created_by")),
  ]).filter(Boolean);
  const requestIds = requestRows.map((request) => getString(request, "id")).filter(Boolean);
  const [
    requestItems,
    profiles,
    confirmationsByRequestId,
    messageSummariesByRequestId,
    currentUserRatingsByRequestId,
  ] = await Promise.all([
    getItemsByIds([...requestedItemIds, ...offeredItemIds, ...counterofferItemIds]),
    getProfilesByIds(profileIds),
    getTradeCompletionConfirmationsByRequestIds(requestIds),
    getTradeRequestMessageSummaries(requestIds, profile.id),
    getCurrentUserRatingsByRequestIds(requestIds, profile.id),
  ]);
  const itemById = Object.fromEntries(requestItems.map((item) => [item.id, item]));
  const profileById = Object.fromEntries(profiles.map((entry) => [entry.id, entry]));

  const requests = requestRows.flatMap((request) => {
    const requestId = getString(request, "id");
    const requestedItem = itemById[getString(request, "requested_item_id")];
    const requester = profileById[getString(request, "requester_id")];
    const receiver = profileById[getString(request, "receiver_id")];
    const offeredItems = rows(request.trade_request_offered_items)
      .map((offered) => itemById[getString(offered, "item_id")])
      .filter(Boolean);
    const counteroffers = rows(request.trade_counteroffers)
      .map((counteroffer) => toTradeCounteroffer(counteroffer, itemById, profileById))
      .filter((counteroffer): counteroffer is TradeCounteroffer => Boolean(counteroffer))
      .sort((first, second) =>
        new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
      );

    if (!requestedItem || !requester || !receiver || offeredItems.length === 0) {
      return [];
    }

    return [
      {
        id: requestId,
        requester,
        receiver,
        requestedItem,
        offeredItems,
        counteroffers,
        message: getOptionalString(request, "message"),
        status: getString(request, "status") as TradeRequest["status"],
        rejectionReason: getOptionalString(request, "rejection_reason"),
        requesterCitySnapshot: getString(request, "requester_city_snapshot"),
        requesterStateSnapshot: getString(request, "requester_state_snapshot"),
        receiverCitySnapshot: getString(request, "receiver_city_snapshot"),
        receiverStateSnapshot: getString(request, "receiver_state_snapshot"),
        isCrossCity: getBoolean(request, "is_cross_city"),
        completionConfirmations: confirmationsByRequestId[requestId] ?? [],
        lastMessageAt: messageSummariesByRequestId[requestId]?.lastMessageAt,
        lastMessagePreview: messageSummariesByRequestId[requestId]?.lastMessagePreview,
        unreadMessageCount: messageSummariesByRequestId[requestId]?.unreadMessageCount ?? 0,
        currentUserRating: currentUserRatingsByRequestId[requestId] ?? null,
        createdAt: getString(request, "created_at"),
      },
    ];
  });

  return requests.sort((first, second) =>
    new Date(second.lastMessageAt ?? second.createdAt).getTime()
    - new Date(first.lastMessageAt ?? first.createdAt).getTime(),
  );
}

export async function getMessagesForRequest(requestId: string) {
  if (!hasSupabasePublicConfig()) {
    return [
      {
        id: "demo-message-1",
        senderId: "user-luis",
        sender: "Luis Medina",
        senderAvatarUrl: getDemoProfile("user-luis")?.avatarUrl,
        body: "Te ofrezco la bici y el kit. La bici necesita ajuste de frenos, tal como dice la publicación.",
        at: "10:12",
        createdAt: new Date().toISOString(),
        mine: false,
      },
      {
        id: "demo-message-2",
        senderId: "user-ana",
        sender: "Ana Torres",
        senderAvatarUrl: getDemoProfile("user-ana")?.avatarUrl,
        body: "Gracias por decirlo claro. ¿La puedo revisar antes de decidir?",
        at: "10:20",
        createdAt: new Date().toISOString(),
        mine: true,
      },
    ];
  }

  const supabase = await createSupabaseServerClient();
  const currentUserId = await getCurrentUserId();
  const { data } = await supabase
    .from("messages")
    .select("*, sender:profiles(id,display_name,avatar_url)")
    .eq("trade_request_id", requestId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  return rows(data).map((message) => ({
    id: getString(message, "id"),
    senderId: getString(message, "sender_id"),
    sender: getString(row(message.sender), "display_name") || "Usuario",
    senderAvatarUrl: getOptionalString(row(message.sender), "avatar_url"),
    body: getString(message, "body"),
    at: formatTime(getString(message, "created_at")),
    createdAt: getString(message, "created_at"),
    mine: getString(message, "sender_id") === currentUserId,
  }));
}

export async function getCurrentUserRatingForRequest(requestId: string) {
  if (!hasSupabasePublicConfig()) {
    return null as TradeRating | null;
  }

  const userId = await getCurrentUserId();

  if (!userId) {
    return null as TradeRating | null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ratings")
    .select("trade_request_id,reviewer_id,reviewed_id,rating,item_description_rating,communication_rating,fair_exchange_rating,reliability_rating,review_tags,comment,item_matched_description,user_was_reliable,created_at")
    .eq("trade_request_id", requestId)
    .eq("reviewer_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null as TradeRating | null;
  }

  return toTradeRating(row(data));
}

export async function recordItemView(itemId: string) {
  if (!hasSupabasePublicConfig()) {
    return 0;
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("record_item_view", {
    p_item_id: itemId,
  });

  return typeof data === "number" ? data : 0;
}

async function getCurrentUserId() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  return userData.user?.id;
}

async function getItemViewCounts(itemIds: string[]) {
  const uniqueIds = Array.from(new Set(itemIds)).filter(Boolean);

  if (uniqueIds.length === 0 || !hasSupabasePublicConfig()) {
    return {} as Record<string, number>;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("item_views")
    .select("item_id,viewer_id")
    .in("item_id", uniqueIds);

  if (error) {
    return {} as Record<string, number>;
  }

  const viewersByItemId = rows(data).reduce<Record<string, Set<string>>>((groups, view) => {
    const itemId = getString(view, "item_id");
    const viewerId = getString(view, "viewer_id");

    if (itemId && viewerId) {
      groups[itemId] ??= new Set<string>();
      groups[itemId].add(viewerId);
    }

    return groups;
  }, {});

  return Object.fromEntries(
    Object.entries(viewersByItemId).map(([itemId, viewers]) => [itemId, viewers.size]),
  );
}

async function getTradeCompletionConfirmationsByRequestIds(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids)).filter(Boolean);

  if (uniqueIds.length === 0 || !hasSupabasePublicConfig()) {
    return {} as Record<string, TradeCompletionConfirmation[]>;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trade_completion_confirmations")
    .select("trade_request_id,user_id,confirmed_at")
    .in("trade_request_id", uniqueIds);

  if (error) {
    return {} as Record<string, TradeCompletionConfirmation[]>;
  }

  return rows(data).reduce<Record<string, TradeCompletionConfirmation[]>>((groups, confirmation) => {
    const requestId = getString(confirmation, "trade_request_id");

    if (!requestId) {
      return groups;
    }

    groups[requestId] ??= [];
    groups[requestId].push({
      userId: getString(confirmation, "user_id"),
      confirmedAt: getString(confirmation, "confirmed_at"),
    });

    return groups;
  }, {});
}

async function getTradeRequestMessageSummaries(ids: string[], currentUserId: string) {
  const uniqueIds = Array.from(new Set(ids)).filter(Boolean);

  if (uniqueIds.length === 0 || !hasSupabasePublicConfig()) {
    return {} as Record<string, {
      lastMessageAt?: string;
      lastMessagePreview?: string;
      unreadMessageCount: number;
    }>;
  }

  const supabase = await createSupabaseServerClient();
  const [messagesResult, readsResult] = await Promise.all([
    supabase
      .from("messages")
      .select("trade_request_id,sender_id,body,created_at")
      .in("trade_request_id", uniqueIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("trade_request_reads")
      .select("trade_request_id,last_read_at")
      .eq("user_id", currentUserId)
      .in("trade_request_id", uniqueIds),
  ]);

  if (messagesResult.error) {
    return {};
  }

  const readAtByRequestId = rows(readsResult.data).reduce<Record<string, string>>((entries, read) => {
    const requestId = getString(read, "trade_request_id");

    if (requestId) {
      entries[requestId] = getString(read, "last_read_at");
    }

    return entries;
  }, {});

  return rows(messagesResult.data).reduce<Record<string, {
    lastMessageAt?: string;
    lastMessagePreview?: string;
    unreadMessageCount: number;
  }>>((summaries, message) => {
    const requestId = getString(message, "trade_request_id");

    if (!requestId) {
      return summaries;
    }

    const createdAt = getString(message, "created_at");
    const senderId = getString(message, "sender_id");
    const readAt = readAtByRequestId[requestId];
    summaries[requestId] ??= {
      unreadMessageCount: 0,
    };

    if (!summaries[requestId].lastMessageAt) {
      summaries[requestId].lastMessageAt = createdAt;
      summaries[requestId].lastMessagePreview = getString(message, "body").slice(0, 140);
    }

    if (senderId !== currentUserId && (!readAt || new Date(createdAt) > new Date(readAt))) {
      summaries[requestId].unreadMessageCount += 1;
    }

    return summaries;
  }, {});
}

async function getCurrentUserRatingsByRequestIds(ids: string[], currentUserId: string) {
  const uniqueIds = Array.from(new Set(ids)).filter(Boolean);

  if (uniqueIds.length === 0 || !hasSupabasePublicConfig()) {
    return {} as Record<string, TradeRating>;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ratings")
    .select("trade_request_id,reviewer_id,reviewed_id,rating,item_description_rating,communication_rating,fair_exchange_rating,reliability_rating,review_tags,comment,item_matched_description,user_was_reliable,created_at")
    .eq("reviewer_id", currentUserId)
    .in("trade_request_id", uniqueIds);

  if (error) {
    return {} as Record<string, TradeRating>;
  }

  return Object.fromEntries(
    rows(data).map((rating) => {
      const tradeRating = toTradeRating(rating);

      return [tradeRating.tradeRequestId, tradeRating];
    }),
  );
}

async function getItemsByIds(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids)).filter(Boolean);

  if (uniqueIds.length === 0) {
    return [] as Item[];
  }

  if (!hasSupabasePublicConfig()) {
    return demoItems.filter((item) => uniqueIds.includes(item.id));
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("items")
    .select(
      `
      *,
      category:categories(id,name,slug,is_prohibited),
      item_photos(public_url,storage_path,sort_order),
      item_public_tags(tags(id,name,slug))
    `,
    )
    .in("id", uniqueIds);

  return rows(data).map(toItem);
}

async function getProfilesByIds(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids)).filter(Boolean);

  if (uniqueIds.length === 0) {
    return [] as Profile[];
  }

  if (!hasSupabasePublicConfig()) {
    return demoProfiles.filter((profile) => uniqueIds.includes(profile.id));
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select(publicProfileColumns)
    .in("id", uniqueIds);

  return rows(data).map(toProfile);
}

function toProfile(entry: DataRow): Profile {
  const publishedItemsCount = getNumber(entry, "published_items_count", 0);
  const completedTradesCount = getNumber(entry, "completed_trades_count", 0);

  return {
    id: getString(entry, "id"),
    displayName: getString(entry, "display_name") || "Usuario Trueka",
    avatarUrl: normalizeStoredMediaUrl(
      getOptionalString(entry, "avatar_url"),
      "profile-avatars",
    ),
    city: getString(entry, "city") || "Guadalajara",
    state: getString(entry, "state") || "Jalisco",
    country: getString(entry, "country") || "México",
    postalCode: getOptionalString(entry, "postal_code"),
    bio: getOptionalString(entry, "bio"),
    phoneVerified: getBoolean(entry, "phone_verified"),
    phoneLast4: getOptionalString(entry, "phone_last4"),
    phoneVerifiedAt: getOptionalString(entry, "phone_verified_at"),
    emailVerified: getBoolean(entry, "email_verified"),
    ratingAvg: getNumber(entry, "rating_avg", 0),
    ratingCount: getNumber(entry, "rating_count", 0),
    completedTradesCount,
    publishedItemsCount,
    isAdmin: getBoolean(entry, "is_admin"),
    isBanned: getBoolean(entry, "is_banned"),
    onboardingCompletedAt: getOptionalString(entry, "onboarding_completed_at"),
    memberSince: getString(entry, "created_at") || new Date().toISOString(),
  };
}

function isTruthyMetadataValue(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return ["true", "t", "1", "yes", "y", "si", "sí"].includes(
      value.toLocaleLowerCase("es-MX"),
    );
  }

  return false;
}

function toItem(entry: DataRow): Item {
  const photoRows = rows(entry.item_photos).sort(
    (first, second) => getNumber(first, "sort_order", 0) - getNumber(second, "sort_order", 0),
  );
  const photoUrls = photoRows
    .map((photo) => {
      const storagePath = getOptionalString(photo, "storage_path");

      return storagePath
        ? getProtectedMediaUrl("item-photos", storagePath)
        : normalizeStoredMediaUrl(getOptionalString(photo, "public_url"), "item-photos");
    })
    .filter((value): value is string => Boolean(value));

  return {
    id: getString(entry, "id"),
    ownerId: getString(entry, "owner_id"),
    title: getString(entry, "title"),
    description: getString(entry, "description"),
    knownDefects: getString(entry, "known_defects"),
    condition: getString(entry, "condition") as Item["condition"],
    category: toCategory(row(entry.category)),
    city: getString(entry, "city"),
    state: getString(entry, "state"),
    country: getString(entry, "country") || "México",
    postalCode: getOptionalString(entry, "postal_code"),
    approximateZone: getOptionalString(entry, "approximate_zone"),
    approximateValueRange: getOptionalString(entry, "approximate_value_range") as Item["approximateValueRange"],
    acceptsMultipleItems: getBoolean(entry, "accepts_multiple_items"),
    acceptsOtherCities: getBoolean(entry, "accepts_other_cities"),
    publicPreferences: getOptionalString(entry, "public_preferences"),
    publicTags: rows(entry.item_public_tags)
      .map((tagRow) => toTag(row(tagRow.tags)))
      .filter((tag) => tag.id),
    privateInterestTags: rows(entry.item_private_interest_tags)
      .map((tagRow) => toTag(row(tagRow.tags)))
      .filter((tag) => tag.id),
    status: getString(entry, "status") as Item["status"],
    moderationStatus: getString(entry, "moderation_status") as Item["moderationStatus"],
    photoUrls: photoUrls.length > 0 ? photoUrls : ["/window.svg"],
    createdAt: getString(entry, "created_at"),
  };
}

function toCategory(entry: DataRow): Category {
  return {
    id: getString(entry, "id"),
    name: getString(entry, "name"),
    slug: getString(entry, "slug"),
    isProhibited: getBoolean(entry, "is_prohibited"),
  };
}

function toTag(entry: DataRow): Tag {
  return {
    id: getString(entry, "id"),
    name: getString(entry, "name"),
    slug: getString(entry, "slug"),
  };
}

function toNotification(entry: DataRow): Notification {
  return {
    id: getString(entry, "id"),
    type: getString(entry, "type") as NotificationType,
    title: getString(entry, "title"),
    body: getOptionalString(entry, "body"),
    href: getString(entry, "href") || "/requests",
    readAt: getOptionalString(entry, "read_at"),
    seenAt: getOptionalString(entry, "seen_at"),
    createdAt: getString(entry, "created_at"),
  };
}

function toTradeCounteroffer(
  entry: DataRow,
  itemsById: Record<string, Item>,
  profilesById: Record<string, Profile>,
): TradeCounteroffer | null {
  const createdBy = profilesById[getString(entry, "created_by")];

  if (!createdBy) {
    return null;
  }

  const itemRows = rows(entry.trade_counteroffer_items);
  const requestedItems = itemRows
    .filter((item) => getString(item, "role") === "requested")
    .map((item) => itemsById[getString(item, "item_id")])
    .filter((item): item is Item => Boolean(item));
  const offeredItems = itemRows
    .filter((item) => getString(item, "role") === "offered")
    .map((item) => itemsById[getString(item, "item_id")])
    .filter((item): item is Item => Boolean(item));

  return {
    id: getString(entry, "id"),
    tradeRequestId: getString(entry, "trade_request_id"),
    createdBy,
    requestedItems,
    offeredItems,
    message: getOptionalString(entry, "message"),
    status: getString(entry, "status") as TradeCounterofferStatus,
    createdAt: getString(entry, "created_at"),
  };
}

function toTradeRating(entry: DataRow): TradeRating {
  return {
    tradeRequestId: getString(entry, "trade_request_id"),
    reviewerId: getString(entry, "reviewer_id"),
    reviewedId: getString(entry, "reviewed_id"),
    rating: getNumber(entry, "rating", 0),
    itemDescriptionRating: getOptionalNumber(entry, "item_description_rating"),
    communicationRating: getOptionalNumber(entry, "communication_rating"),
    fairExchangeRating: getOptionalNumber(entry, "fair_exchange_rating"),
    reliabilityRating: getOptionalNumber(entry, "reliability_rating"),
    reviewTags: getStringArray(entry, "review_tags"),
    comment: getOptionalString(entry, "comment"),
    itemMatchedDescription: getBoolean(entry, "item_matched_description"),
    userWasReliable: getBoolean(entry, "user_was_reliable"),
    createdAt: getString(entry, "created_at"),
  };
}

function toProfileReview(entry: DataRow): ProfileReview {
  const reviewer = row(entry.reviewer);

  return {
    id: getString(entry, "id"),
    tradeRequestId: getString(entry, "trade_request_id"),
    reviewerId: getString(entry, "reviewer_id"),
    reviewerName: getString(reviewer, "display_name") || "Usuario Trueka",
    reviewerAvatarUrl: getOptionalString(reviewer, "avatar_url"),
    rating: getNumber(entry, "rating", 0),
    itemDescriptionRating: getOptionalNumber(entry, "item_description_rating"),
    communicationRating: getOptionalNumber(entry, "communication_rating"),
    fairExchangeRating: getOptionalNumber(entry, "fair_exchange_rating"),
    reliabilityRating: getOptionalNumber(entry, "reliability_rating"),
    reviewTags: getStringArray(entry, "review_tags"),
    comment: getOptionalString(entry, "comment"),
    itemMatchedDescription: getBoolean(entry, "item_matched_description"),
    userWasReliable: getBoolean(entry, "user_was_reliable"),
    createdAt: getString(entry, "created_at"),
  };
}

function buildTradeRequestNotifications(
  tradeRequests: TradeRequest[],
  currentUserId: string,
  limit: number,
) {
  return tradeRequests
    .filter((request) => request.receiver.id === currentUserId && request.status === "pending")
    .slice(0, limit)
    .map((request): Notification => ({
      id: request.id,
      type: "trade_request_received",
      title: "Nueva solicitud de trueque",
      body: `${request.requester.displayName} quiere truequear por ${request.requestedItem.title}.`,
      href: `/requests/${request.id}`,
      createdAt: request.createdAt,
    }));
}

function buildOwnersById(items: Item[], profiles: Profile[]) {
  const profileById = Object.fromEntries(profiles.map((profile) => [profile.id, profile]));

  return Object.fromEntries(
    items.flatMap((item) => {
      const owner = profileById[item.ownerId];

      return owner ? [[item.ownerId, owner]] : [];
    }),
  );
}

function buildProfileStats(
  profile: Profile,
  activeItemsCount: number,
  totalItemViews = 0,
): ProfileStats {
  const tradeRate = profile.publishedItemsCount > 0
    ? Math.round((profile.completedTradesCount / profile.publishedItemsCount) * 100)
    : 0;

  return {
    activeItemsCount,
    publishedItemsCount: profile.publishedItemsCount,
    completedTradesCount: profile.completedTradesCount,
    tradeRate,
    totalItemViews,
  };
}

function rows(value: unknown) {
  return Array.isArray(value) ? value.map(row) : [];
}

function row(value: unknown): DataRow {
  return value && typeof value === "object" && !Array.isArray(value) ? value as DataRow : {};
}

function getString(entry: DataRow, key: string) {
  const value = entry[key];

  return typeof value === "string" ? value : "";
}

function getOptionalString(entry: DataRow, key: string) {
  const value = getString(entry, key);

  return value || undefined;
}

function getBoolean(entry: DataRow, key: string) {
  return entry[key] === true;
}

function getOptionalBoolean(entry: DataRow, key: string) {
  const value = entry[key];

  return typeof value === "boolean" ? value : undefined;
}

function getNumber(entry: DataRow, key: string, fallback: number) {
  const value = entry[key];

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function getOptionalNumber(entry: DataRow, key: string) {
  const value = entry[key];

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function getStringArray(entry: DataRow, key: string) {
  const value = entry[key];

  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
