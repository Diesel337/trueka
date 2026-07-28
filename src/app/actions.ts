"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { normalizeInternalNext } from "@/lib/auth-redirect";
import { getRestoredItemState } from "@/lib/admin-moderation";
import { getNotificationsForCurrentUser, getUnreadNotificationCount } from "@/lib/data";
import { getProtectedMediaUrl } from "@/lib/media-url";
import { getPublicDatabaseErrorMessage } from "@/lib/observability";
import {
  buildProhibitedItemReviewReason,
  findProhibitedItemReviewReasons,
} from "@/lib/prohibited-items";
import { reviewTagSlugs } from "@/lib/review-tags";
import { hasSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCanonicalMunicipalityName, isValidStateMunicipality } from "@/lib/mexico-locations";
import { getPublicPostalCodeArea, normalizePostalCode } from "@/lib/postal-code-proximity";
import {
  canCancelTradeRequest,
  canCompleteTradeRequest,
  canUseTradeRequestChat,
} from "@/lib/trade-rules";
import type { AdminModerationActionName, Item, ItemStatus, TradeRequestStatus } from "@/lib/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const postalCodeSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : ""),
  z.string()
    .refine((value) => value === "" || normalizePostalCode(value) === value, {
      message: "Escribe un codigo postal de 5 digitos.",
    })
    .transform((value) => value || undefined),
);

const createTradeRequestSchema = z.object({
  requestedItemId: z.string().uuid(),
  offeredItemIds: z.array(z.string().uuid()).min(1),
  message: z.string().max(1000).optional(),
  acknowledgeNoManagedExchange: z.literal("on"),
});

const createItemSchema = z.object({
  title: z.string().trim().min(3).max(120),
  category: z.string().trim().min(1),
  condition: z.enum([
    "new",
    "like_new",
    "used_good",
    "used_with_details",
    "works_with_issues",
    "for_repair",
    "not_working_parts",
  ]),
  approximateValueRange: z.string().trim().optional(),
  description: z.string().trim().min(20),
  knownDefects: z.string().trim().min(3),
  city: z.string().trim().min(2),
  state: z.string().trim().min(2),
  postalCode: postalCodeSchema,
  approximateZone: z.string().trim().optional(),
  publicPreferences: z.string().trim().optional(),
});

const updateItemSchema = createItemSchema.extend({
  itemId: z.string().uuid(),
});

const authSchema = z.object({
  email: z.string().email("Escribe un correo válido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  next: z.string().optional(),
});

const messageSchema = z.object({
  tradeRequestId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
});

const notificationSchema = z.object({
  notificationId: z.string().min(1),
  href: z.string().min(1),
});

const reportSchema = z.object({
  reportedUserId: z.string().trim().optional(),
  reportedItemId: z.string().trim().optional(),
  tradeRequestId: z.string().trim().optional(),
  reason: z.enum([
    "prohibited_item",
    "false_information",
    "suspicious_user",
    "possible_scam",
    "harassment",
    "stolen_item",
    "misleading_photos",
    "other",
  ]),
  details: z.string().trim().max(1000).optional(),
});

const dataDeletionRequestSchema = z.object({
  email: z.string().trim().email("Escribe el correo de tu cuenta."),
  provider: z.enum(["email", "google", "facebook", "other"]),
  details: z.string().trim().max(1000).optional(),
  acknowledgeManualReview: z.literal("on"),
});

const blockUserSchema = z.object({
  blockedUserId: z.string().trim().min(1),
});

const itemStatusSchema = z.object({
  itemId: z.string().uuid(),
  status: z.enum(["active", "paused"]),
});

const retireItemSchema = z.object({
  itemId: z.string().uuid(),
  confirmRetire: z.literal("on"),
});

const savedItemSchema = z.object({
  itemId: z.string().min(1),
  next: z.string().optional(),
});

const tradeRequestStatusSchema = z.object({
  tradeRequestId: z.string().uuid(),
  status: z.enum(["accepted", "rejected", "cancelled", "completed"]),
  rejectionReason: z.string().trim().optional(),
  acknowledgeCancellation: z.literal("on").optional(),
});

const createCounterofferSchema = z.object({
  tradeRequestId: z.string().uuid(),
  requestedOfferedItemIds: z.array(z.string().uuid()).min(1),
  message: z.string().trim().max(1000).optional(),
  acknowledgeNoManagedExchange: z.literal("on"),
});

const respondCounterofferSchema = z.object({
  counterofferId: z.string().uuid(),
  status: z.enum(["accepted", "rejected"]),
});

const tradeRatingSchema = z.object({
  tradeRequestId: z.string().uuid(),
  reviewedUserId: z.string().uuid(),
  itemDescriptionRating: z.coerce.number().int().min(1).max(5),
  communicationRating: z.coerce.number().int().min(1).max(5),
  fairExchangeRating: z.coerce.number().int().min(1).max(5),
  reliabilityRating: z.coerce.number().int().min(1).max(5),
  reviewTags: z.array(z.enum(reviewTagSlugs)).max(6),
  comment: z.string().trim().max(600).optional(),
});

const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  postalCode: postalCodeSchema,
  bio: z.string().trim().max(240).optional(),
});

const phoneVerificationRequestSchema = z.object({
  phone: z.string().trim().min(8).max(24),
});

const phoneVerificationConfirmSchema = phoneVerificationRequestSchema.extend({
  token: z.string().trim().min(4).max(10),
});

const onboardingSchema = profileSchema.extend({
  next: z.string().optional(),
});

const markTradeRequestReadSchema = z.object({
  tradeRequestId: z.string().uuid(),
});

const adminActionSchema = z.object({
  intent: z.enum([
    "hide_item",
    "restore_item",
    "approve_item",
    "reject_item",
    "ban_user",
    "unban_user",
    "review_report",
    "resolve_report",
    "dismiss_report",
    "update_report_notes",
    "review_data_deletion_request",
    "complete_data_deletion_request",
    "cancel_data_deletion_request",
    "update_data_deletion_request_notes",
  ]),
  itemId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  reportId: z.string().uuid().optional(),
  dataDeletionRequestId: z.string().uuid().optional(),
  adminNotes: z.string().trim().max(1000).optional(),
});

const maxPhotoSizeBytes = 5 * 1024 * 1024;
const maxTotalPhotoSizeBytes = 30 * 1024 * 1024;
const maxAvatarSizeBytes = 3 * 1024 * 1024;
const maxPublicItemTags = 6;
const maxPrivateItemTags = 12;

export async function signInWithEmailAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Revisa correo y contraseña.",
    };
  }

  if (!hasSupabasePublicConfig()) {
    return {
      ok: false,
      message: "Falta conectar Supabase para iniciar sesión real.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return {
      ok: false,
      message: getAuthActionErrorMessage(error, "sign-in"),
    };
  }

  revalidatePath("/", "layout");

  return {
    ok: true,
    message: "Sesión iniciada.",
    href: await getPostAuthRedirect(supabase, parsed.data.next),
  };
}

export async function signUpWithEmailAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Revisa correo y contraseña.",
    };
  }

  if (!hasSupabasePublicConfig()) {
    return {
      ok: false,
      message: "Falta conectar Supabase para crear cuentas reales.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        display_name: parsed.data.email.split("@")[0],
      },
    },
  });

  if (error) {
    return {
      ok: false,
      message: getAuthActionErrorMessage(error, "sign-up"),
    };
  }

  revalidatePath("/", "layout");

  return {
    ok: true,
    message: data.session
      ? "Cuenta creada. Entrando a Trueka."
      : "Cuenta creada. Revisa tu correo si Supabase pide confirmación.",
    href: data.session ? await getPostAuthRedirect(supabase, parsed.data.next) : undefined,
  };
}

export async function signOutAction() {
  if (hasSupabasePublicConfig()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function createTradeRequestAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!hasSupabasePublicConfig()) {
    return {
      ok: false,
      message:
        "Falta conectar Supabase. La validación local está lista, pero la solicitud todavía no se puede guardar.",
    };
  }

  const parsed = createTradeRequestSchema.safeParse({
    requestedItemId: formData.get("requestedItemId"),
    offeredItemIds: formData.getAll("offeredItemIds"),
    message: formData.get("message")?.toString(),
    acknowledgeNoManagedExchange: formData.get("acknowledgeNoManagedExchange"),
  });

  if (!parsed.success) {
    const mustConfirmRule = parsed.error.issues.some((issue) =>
      issue.path.includes("acknowledgeNoManagedExchange"),
    );

    return {
      ok: false,
      message: mustConfirmRule
        ? "Confirma que Trueka no maneja pagos, envíos ni entregas."
        : parsed.error.issues[0]?.message ?? "Elige al menos un artículo propio para proponer el trueque.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user?.id) {
    return {
      ok: false,
      message: "Inicia sesion para enviar solicitudes.",
    };
  }

  const { data: requestId, error } = await supabase.rpc("create_trade_request", {
    p_requested_item_id: parsed.data.requestedItemId,
    p_offered_item_ids: parsed.data.offeredItemIds,
    p_message: parsed.data.message ?? null,
  });

  if (error) {
    return {
      ok: false,
      message: getPublicDatabaseErrorMessage(
        error,
        "No se pudo enviar la solicitud. Revisa que los articulos sigan disponibles.",
      ),
    };
  }

  revalidatePath("/requests");
  revalidatePath("/", "layout");

  return {
    ok: true,
    message: "Solicitud de trueque enviada.",
    href: typeof requestId === "string" ? `/requests/${requestId}` : "/requests",
  };
}

export async function createItemAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!hasSupabasePublicConfig()) {
    return {
      ok: false,
      message:
        "Falta conectar Supabase para guardar publicaciones reales. El formulario ya está listo.",
    };
  }

  const parsed = createItemSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    condition: formData.get("condition"),
    approximateValueRange: formData.get("approximateValueRange"),
    description: formData.get("description"),
    knownDefects: formData.get("knownDefects"),
    city: formData.get("city"),
    state: formData.get("state"),
    postalCode: formData.get("postalCode"),
    approximateZone: formData.get("approximateZone"),
    publicPreferences: formData.get("publicPreferences"),
  });
  const intent = formData.get("intent") === "draft" ? "draft" : "publish";

  if (!parsed.success) {
    return {
      ok: false,
      message: getCreateItemValidationMessage(parsed.error),
    };
  }

  const canonicalCity = getCanonicalMunicipalityName(parsed.data.state, parsed.data.city);

  if (!isValidStateMunicipality(parsed.data.state, canonicalCity)) {
    return {
      ok: false,
      message: "Elige un estado y municipio válidos.",
    };
  }

  const photos = formData
    .getAll("photos")
    .filter((photo): photo is File => photo instanceof File && photo.size > 0)
    .slice(0, 8);

  if (intent === "publish" && photos.length === 0) {
    return {
      ok: false,
      message: "Sube al menos una foto real del artículo.",
    };
  }

  const oversizedPhoto = photos.find((photo) => photo.size > maxPhotoSizeBytes);

  if (oversizedPhoto) {
    return {
      ok: false,
      message: `La foto "${oversizedPhoto.name}" pesa más de 5 MB. Elige una imagen más ligera.`,
    };
  }

  const totalPhotoSize = photos.reduce((sum, photo) => sum + photo.size, 0);

  if (totalPhotoSize > maxTotalPhotoSizeBytes) {
    return {
      ok: false,
      message: "Tus fotos pesan más de 30 MB en total. Quita algunas o usa imágenes más ligeras.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    return {
      ok: false,
      message: "Inicia sesión para publicar un artículo.",
    };
  }

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id,is_prohibited")
    .eq("slug", parsed.data.category)
    .eq("is_active", true)
    .maybeSingle();

  if (categoryError || !category || category.is_prohibited) {
    return {
      ok: false,
      message: "Esta categoría no está disponible para publicar.",
    };
  }

  const prohibitedReviewReasons = intent === "publish"
    ? findProhibitedItemReviewReasons(parsed.data)
    : [];
  const needsModerationReview = prohibitedReviewReasons.length > 0;

  const { data: item, error: itemError } = await supabase
    .from("items")
    .insert({
      owner_id: userId,
      title: parsed.data.title,
      description: parsed.data.description,
      known_defects: parsed.data.knownDefects,
      category_id: category.id,
      condition: parsed.data.condition,
      city: canonicalCity,
      state: parsed.data.state,
      postal_code: getPublicPostalCodeArea(parsed.data.postalCode) ?? null,
      approximate_zone: emptyToNull(parsed.data.approximateZone),
      approximate_value_range: emptyToNull(parsed.data.approximateValueRange),
      accepts_multiple_items: formData.has("acceptsMultipleItems"),
      accepts_other_cities: formData.has("acceptsOtherCities"),
      public_preferences: emptyToNull(parsed.data.publicPreferences),
      status: "draft",
      moderation_status: needsModerationReview ? "pending" : "active",
    })
    .select("id")
    .single();

  if (itemError || !item) {
    return {
      ok: false,
      message: getPostalCodePersistenceErrorMessage(itemError?.message)
        ?? "No se pudo crear la publicación.",
    };
  }

  const photoRows = [];

  for (const [index, photo] of photos.entries()) {
    const path = `${userId}/${item.id}/${crypto.randomUUID()}-${safeFileName(photo.name)}`;
    const { data: uploaded, error: uploadError } = await supabase.storage
      .from("item-photos")
      .upload(path, photo, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError || !uploaded) {
      await supabase.from("items").update({ status: "deleted" }).eq("id", item.id);

      return {
        ok: false,
        message: "No se pudo subir una foto. Revisa el formato y el tamano del archivo.",
      };
    }

    photoRows.push({
      item_id: item.id,
      storage_path: uploaded.path,
      public_url: getProtectedMediaUrl("item-photos", uploaded.path),
      sort_order: index,
    });
  }

  if (photoRows.length > 0) {
    const { error } = await supabase.from("item_photos").insert(photoRows);

    if (error) {
      await supabase.from("items").update({ status: "deleted" }).eq("id", item.id);

      return {
        ok: false,
        message: getPublicDatabaseErrorMessage(
          error,
          "No se pudieron guardar las fotos del articulo.",
        ),
      };
    }
  }

  const publicTagError = await insertItemTags(
    supabase,
    "item_public_tags",
    item.id,
    getSelectedTagSlugs(formData.getAll("publicTags"), maxPublicItemTags),
  );

  if (publicTagError) {
    return {
      ok: false,
      message: publicTagError,
    };
  }

  const privateTagError = await insertItemTags(
    supabase,
    "item_private_interest_tags",
    item.id,
    getSelectedTagSlugs(formData.getAll("privateInterestTags"), maxPrivateItemTags),
  );

  if (privateTagError) {
    return {
      ok: false,
      message: privateTagError,
    };
  }

  if (needsModerationReview) {
    await createItemModerationReview(supabase, {
      itemId: item.id,
      openedBy: userId,
      reason: buildProhibitedItemReviewReason(prohibitedReviewReasons),
    });
  }

  if (intent === "publish" && !needsModerationReview) {
    const { error: publishError } = await supabase
      .from("items")
      .update({ status: "active" })
      .eq("id", item.id)
      .eq("owner_id", userId);

    if (publishError) {
      return {
        ok: false,
        message: "La publicacion se guardo como borrador, pero no pudo activarse.",
      };
    }

    await supabase.rpc("notify_item_interest_matches", {
      p_item_id: item.id,
    });
  }

  revalidatePath("/");
  revalidatePath("/items");
  revalidatePath("/profile");

  return {
    ok: true,
    message: needsModerationReview
      ? "Tu publicación quedó en revisión antes de aparecer en Explorar."
      : intent === "draft" ? "Borrador guardado." : "Artículo publicado.",
    href: formData.get("next")
      ? normalizeInternalNext(formData.get("next")?.toString())
      : `/items/${item.id}`,
  };
}

export async function updateItemAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!hasSupabasePublicConfig()) {
    return {
      ok: false,
      message: "Falta conectar Supabase para editar publicaciones reales.",
    };
  }

  const parsed = updateItemSchema.safeParse({
    itemId: formData.get("itemId"),
    title: formData.get("title"),
    category: formData.get("category"),
    condition: formData.get("condition"),
    approximateValueRange: formData.get("approximateValueRange"),
    description: formData.get("description"),
    knownDefects: formData.get("knownDefects"),
    city: formData.get("city"),
    state: formData.get("state"),
    postalCode: formData.get("postalCode"),
    approximateZone: formData.get("approximateZone"),
    publicPreferences: formData.get("publicPreferences"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: getCreateItemValidationMessage(parsed.error),
    };
  }

  const canonicalCity = getCanonicalMunicipalityName(parsed.data.state, parsed.data.city);

  if (!isValidStateMunicipality(parsed.data.state, canonicalCity)) {
    return {
      ok: false,
      message: "Elige un estado y municipio válidos.",
    };
  }

  const photos = formData
    .getAll("photos")
    .filter((photo): photo is File => photo instanceof File && photo.size > 0)
    .slice(0, 8);
  const oversizedPhoto = photos.find((photo) => photo.size > maxPhotoSizeBytes);

  if (oversizedPhoto) {
    return {
      ok: false,
      message: `La foto "${oversizedPhoto.name}" pesa más de 5 MB. Elige una imagen más ligera.`,
    };
  }

  const totalPhotoSize = photos.reduce((sum, photo) => sum + photo.size, 0);

  if (totalPhotoSize > maxTotalPhotoSizeBytes) {
    return {
      ok: false,
      message: "Tus fotos pesan más de 30 MB en total. Quita algunas o usa imágenes más ligeras.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    return {
      ok: false,
      message: "Inicia sesión para editar esta publicación.",
    };
  }

  const { data: existingItem, error: existingItemError } = await supabase
    .from("items")
    .select("id,owner_id,status,moderation_status,item_photos(storage_path)")
    .eq("id", parsed.data.itemId)
    .maybeSingle();

  if (existingItemError || !existingItem) {
    return {
      ok: false,
      message: "Publicación no encontrada.",
    };
  }

  if (String(existingItem.owner_id) !== userId) {
    return {
      ok: false,
      message: "Solo puedes editar tus propias publicaciones.",
    };
  }

  if (!["active", "paused", "draft"].includes(String(existingItem.status))) {
    return {
      ok: false,
      message: "Esta publicación ya no se puede editar.",
    };
  }

  if (String(existingItem.moderation_status) === "hidden_by_admin") {
    return {
      ok: false,
      message: "Esta publicación está oculta por moderación y no se puede editar.",
    };
  }

  const existingPhotoRows = Array.isArray(existingItem.item_photos)
    ? existingItem.item_photos
    : [];

  if (String(existingItem.status) !== "draft" && existingPhotoRows.length === 0 && photos.length === 0) {
    return {
      ok: false,
      message: "Sube al menos una foto real del artículo.",
    };
  }

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id,is_prohibited")
    .eq("slug", parsed.data.category)
    .eq("is_active", true)
    .maybeSingle();

  if (categoryError || !category || category.is_prohibited) {
    return {
      ok: false,
      message: "Esta categoría no está disponible para publicar.",
    };
  }

  const editReviewReasons = String(existingItem.status) !== "draft"
    ? findProhibitedItemReviewReasons(parsed.data)
    : [];
  const editNeedsModerationReview = editReviewReasons.length > 0;

  const uploadedPhotoRows: {
    item_id: string;
    storage_path: string;
    public_url: string;
    sort_order: number;
  }[] = [];

  for (const [index, photo] of photos.entries()) {
    const path = `${userId}/${parsed.data.itemId}/${crypto.randomUUID()}-${safeFileName(photo.name)}`;
    const { data: uploaded, error: uploadError } = await supabase.storage
      .from("item-photos")
      .upload(path, photo, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError || !uploaded) {
      await removeStoragePhotos(uploadedPhotoRows.map((row) => row.storage_path));

      return {
        ok: false,
        message: "No se pudo subir una foto. Revisa el formato y el tamano del archivo.",
      };
    }

    uploadedPhotoRows.push({
      item_id: parsed.data.itemId,
      storage_path: uploaded.path,
      public_url: getProtectedMediaUrl("item-photos", uploaded.path),
      sort_order: index,
    });
  }

  const { error: updateError } = await supabase
    .from("items")
    .update({
      title: parsed.data.title,
      description: parsed.data.description,
      known_defects: parsed.data.knownDefects,
      category_id: category.id,
      condition: parsed.data.condition,
      city: canonicalCity,
      state: parsed.data.state,
      postal_code: getPublicPostalCodeArea(parsed.data.postalCode) ?? null,
      approximate_zone: emptyToNull(parsed.data.approximateZone),
      approximate_value_range: emptyToNull(parsed.data.approximateValueRange),
      accepts_multiple_items: formData.has("acceptsMultipleItems"),
      accepts_other_cities: formData.has("acceptsOtherCities"),
      public_preferences: emptyToNull(parsed.data.publicPreferences),
      ...(editNeedsModerationReview
        ? {
            status: "draft",
            moderation_status: "pending",
          }
        : {}),
    })
    .eq("id", parsed.data.itemId)
    .eq("owner_id", userId);

  if (updateError) {
    await removeStoragePhotos(uploadedPhotoRows.map((row) => row.storage_path));

    return {
      ok: false,
      message: getPostalCodePersistenceErrorMessage(updateError.message)
        ?? getPublicDatabaseErrorMessage(
          updateError,
          "No se pudieron guardar los cambios de la publicacion.",
        ),
    };
  }

  if (uploadedPhotoRows.length > 0) {
    const { error } = await supabase.from("item_photos").insert(uploadedPhotoRows);

    if (error) {
      await removeStoragePhotos(uploadedPhotoRows.map((row) => row.storage_path));

      return {
        ok: false,
        message: getPublicDatabaseErrorMessage(
          error,
          "No se pudieron guardar las fotos nuevas del articulo.",
        ),
      };
    }

    const oldStoragePaths = existingPhotoRows
      .map((photo) => typeof photo.storage_path === "string" ? photo.storage_path : "")
      .filter(Boolean);

    if (oldStoragePaths.length > 0) {
      await supabase
        .from("item_photos")
        .delete()
        .eq("item_id", parsed.data.itemId)
        .in("storage_path", oldStoragePaths);
      await removeStoragePhotos(oldStoragePaths);
    }
  }

  await supabase
    .from("item_private_interest_tags")
    .delete()
    .eq("item_id", parsed.data.itemId);

  await supabase
    .from("item_public_tags")
    .delete()
    .eq("item_id", parsed.data.itemId);

  const publicTagError = await insertItemTags(
    supabase,
    "item_public_tags",
    parsed.data.itemId,
    getSelectedTagSlugs(formData.getAll("publicTags"), maxPublicItemTags),
  );

  if (publicTagError) {
    return {
      ok: false,
      message: publicTagError,
    };
  }

  const privateTagError = await insertItemTags(
    supabase,
    "item_private_interest_tags",
    parsed.data.itemId,
    getSelectedTagSlugs(formData.getAll("privateInterestTags"), maxPrivateItemTags),
  );

  if (privateTagError) {
    return {
      ok: false,
      message: privateTagError,
    };
  }

  if (editNeedsModerationReview) {
    await createItemModerationReview(supabase, {
      itemId: parsed.data.itemId,
      openedBy: userId,
      reason: buildProhibitedItemReviewReason(editReviewReasons),
    });
  }

  revalidatePath("/");
  revalidatePath("/items");
  revalidatePath("/profile");
  revalidatePath(`/items/${parsed.data.itemId}`);
  revalidatePath(`/items/${parsed.data.itemId}/edit`);

  return {
    ok: true,
    message: editNeedsModerationReview
      ? "Publicación actualizada y enviada a revisión antes de volver a Explorar."
      : "Publicación actualizada.",
    href: `/items/${parsed.data.itemId}`,
  };
}

export async function sendMessageAction(formData: FormData): Promise<ActionState> {
  if (!hasSupabasePublicConfig()) {
    return {
      ok: true,
      message: "Mensaje visible en demo local. Con Supabase conectado se guardará en la solicitud.",
    };
  }

  const parsed = messageSchema.safeParse({
    tradeRequestId: formData.get("tradeRequestId"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Escribe un mensaje válido.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    return {
      ok: false,
      message: "Inicia sesión para enviar mensajes.",
    };
  }

  const { data: tradeRequest, error: requestError } = await supabase
    .from("trade_requests")
    .select("id,requester_id,receiver_id,requested_item_id,status")
    .eq("id", parsed.data.tradeRequestId)
    .maybeSingle();

  if (requestError || !tradeRequest) {
    return {
      ok: false,
      message: "Solicitud no encontrada.",
    };
  }

  const participantIds = [
    String(tradeRequest.requester_id),
    String(tradeRequest.receiver_id),
  ];

  if (!participantIds.includes(userId)) {
    return {
      ok: false,
      message: "No puedes escribir en esta solicitud.",
    };
  }

  if (!canUseTradeRequestChat(String(tradeRequest.status) as TradeRequestStatus)) {
    return {
      ok: false,
      message: "El chat se habilita cuando la solicitud está aceptada y en negociación.",
    };
  }

  const { error } = await supabase.from("messages").insert({
    trade_request_id: parsed.data.tradeRequestId,
    sender_id: userId,
    body: parsed.data.body,
  });

  if (error) {
    return {
      ok: false,
      message: getPublicDatabaseErrorMessage(
        error,
        "No se pudo enviar el mensaje. Intenta de nuevo.",
      ),
    };
  }

  await supabase.rpc("mark_trade_request_read", {
    p_trade_request_id: parsed.data.tradeRequestId,
  });

  revalidatePath(`/requests/${parsed.data.tradeRequestId}`);
  revalidatePath("/requests");
  revalidatePath("/", "layout");

  return {
    ok: true,
    message: "Mensaje enviado.",
  };
}

export async function markTradeRequestReadAction(tradeRequestId: string) {
  const parsed = markTradeRequestReadSchema.safeParse({ tradeRequestId });

  if (!parsed.success || !hasSupabasePublicConfig()) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user?.id) {
    return;
  }

  const { error } = await supabase.rpc("mark_trade_request_read", {
    p_trade_request_id: parsed.data.tradeRequestId,
  });

  const readAt = new Date().toISOString();
  await supabase
    .from("notifications")
    .update({ read_at: readAt, seen_at: readAt })
    .eq("recipient_id", userData.user.id)
    .eq("trade_request_id", parsed.data.tradeRequestId)
    .eq("type", "message_received")
    .is("read_at", null);

  if (!error) {
    revalidatePath("/requests");
    revalidatePath(`/requests/${parsed.data.tradeRequestId}`);
    revalidatePath("/", "layout");
  }
}

export async function updateItemStatusAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!hasSupabasePublicConfig()) {
    return {
      ok: false,
      message: "Falta conectar Supabase para actualizar publicaciones reales.",
    };
  }

  const parsed = itemStatusSchema.safeParse({
    itemId: formData.get("itemId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "No se pudo actualizar la publicación.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    return {
      ok: false,
      message: "Inicia sesión para administrar tus publicaciones.",
    };
  }

  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("id,owner_id,title,description,known_defects,status,moderation_status,item_photos(id)")
    .eq("id", parsed.data.itemId)
    .maybeSingle();

  if (itemError || !item) {
    return {
      ok: false,
      message: "Publicación no encontrada.",
    };
  }

  if (String(item.owner_id) !== userId) {
    return {
      ok: false,
      message: "Solo puedes administrar tus propias publicaciones.",
    };
  }

  const currentStatus = String(item.status) as ItemStatus;

  if (!["active", "paused", "draft"].includes(currentStatus)) {
    return {
      ok: false,
      message: "Esta publicación ya no se puede pausar, publicar o reactivar.",
    };
  }

  if (currentStatus === "draft" && parsed.data.status !== "active") {
    return {
      ok: false,
      message: "Un borrador solo puede publicarse cuando esté listo.",
    };
  }

  if (parsed.data.status === "active" && item.moderation_status !== "active") {
    return {
      ok: false,
      message: "Esta publicación no puede reactivarse porque está en revisión.",
    };
  }

  const itemPhotoRows = Array.isArray(item.item_photos) ? item.item_photos : [];

  if (currentStatus === "draft" && itemPhotoRows.length === 0) {
    return {
      ok: false,
      message: "Agrega al menos una foto real antes de publicar este borrador.",
    };
  }

  if (currentStatus === "draft" && parsed.data.status === "active") {
    const draftReviewReasons = findProhibitedItemReviewReasons({
      title: getRecordString(item, "title") ?? "",
      description: getRecordString(item, "description") ?? "",
      knownDefects: getRecordString(item, "known_defects") ?? "",
    });

    if (draftReviewReasons.length > 0) {
      const { error } = await supabase
        .from("items")
        .update({ moderation_status: "pending" })
        .eq("id", parsed.data.itemId)
        .eq("owner_id", userId);

      if (error) {
        return {
          ok: false,
          message: getPublicDatabaseErrorMessage(
            error,
            "No se pudo enviar la publicacion a revision.",
          ),
        };
      }

      await createItemModerationReview(supabase, {
        itemId: parsed.data.itemId,
        openedBy: userId,
        reason: buildProhibitedItemReviewReason(draftReviewReasons),
      });

      revalidatePath("/profile");
      revalidatePath(`/items/${parsed.data.itemId}`);

      return {
        ok: true,
        message: "Tu publicación quedó en revisión antes de aparecer en Explorar.",
      };
    }
  }

  if (parsed.data.status === currentStatus) {
    return {
      ok: true,
      message: getItemStatusMessage(parsed.data.status),
    };
  }

  const { error } = await supabase
    .from("items")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.itemId)
    .eq("owner_id", userId);

  if (error) {
    return {
      ok: false,
      message: getPublicDatabaseErrorMessage(
        error,
        "No se pudo cambiar el estado de la publicacion.",
      ),
    };
  }

  if (currentStatus === "draft" && parsed.data.status === "active") {
    await supabase.rpc("notify_item_interest_matches", {
      p_item_id: parsed.data.itemId,
    });
  }

  revalidatePath("/");
  revalidatePath("/items");
  revalidatePath("/profile");
  revalidatePath(`/items/${parsed.data.itemId}`);
  revalidatePath(`/users/${userId}`);

  return {
    ok: true,
    message: getItemStatusMessage(parsed.data.status),
  };
}

export async function retireItemAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!hasSupabasePublicConfig()) {
    return {
      ok: false,
      message: "Falta conectar Supabase para retirar publicaciones reales.",
    };
  }

  const parsed = retireItemSchema.safeParse({
    itemId: formData.get("itemId"),
    confirmRetire: formData.get("confirmRetire"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Confirma que quieres retirar esta publicación.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    return {
      ok: false,
      message: "Inicia sesión para administrar tus publicaciones.",
    };
  }

  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("id,owner_id,status,moderation_status")
    .eq("id", parsed.data.itemId)
    .maybeSingle();

  if (itemError || !item) {
    return {
      ok: false,
      message: "Publicación no encontrada.",
    };
  }

  if (String(item.owner_id) !== userId) {
    return {
      ok: false,
      message: "Solo puedes retirar tus propias publicaciones.",
    };
  }

  const currentStatus = String(item.status) as ItemStatus;

  if (!["active", "paused", "draft"].includes(currentStatus)) {
    return {
      ok: false,
      message: "Esta publicación ya no se puede retirar.",
    };
  }

  if (String(item.moderation_status) === "hidden_by_admin") {
    return {
      ok: false,
      message: "Esta publicación está oculta por moderación.",
    };
  }

  const { error } = await supabase
    .from("items")
    .update({ status: "deleted" })
    .eq("id", parsed.data.itemId)
    .eq("owner_id", userId);

  if (error) {
    return {
      ok: false,
      message: getPublicDatabaseErrorMessage(
        error,
        "No se pudo retirar la publicacion.",
      ),
    };
  }

  const { data: offeredRows } = await supabase
    .from("trade_request_offered_items")
    .select("trade_request_id")
    .eq("item_id", parsed.data.itemId);
  const offeredRequestIds = (offeredRows ?? [])
    .map((row) => String(row.trade_request_id))
    .filter(Boolean);

  await supabase
    .from("trade_requests")
    .update({ status: "expired" })
    .eq("requested_item_id", parsed.data.itemId)
    .in("status", ["pending", "accepted", "countered"]);

  if (offeredRequestIds.length > 0) {
    await supabase
      .from("trade_requests")
      .update({ status: "expired" })
      .in("id", offeredRequestIds)
      .in("status", ["pending", "accepted", "countered"]);
  }

  revalidatePath("/");
  revalidatePath("/items");
  revalidatePath("/profile");
  revalidatePath("/requests");
  revalidatePath(`/items/${parsed.data.itemId}`);
  revalidatePath(`/items/${parsed.data.itemId}/edit`);
  revalidatePath(`/users/${userId}`);
  revalidatePath("/", "layout");

  return {
    ok: true,
    message: "Publicación retirada. Ya no aparece en Explorar ni recibe nuevas solicitudes.",
    href: "/profile",
  };
}

export async function toggleSavedItemAction(formData: FormData): Promise<ActionState & { saved?: boolean }> {
  const parsed = savedItemSchema.safeParse({
    itemId: formData.get("itemId"),
    next: formData.get("next"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "No se pudo guardar este artículo.",
    };
  }

  const nextPath = normalizeInternalNext(parsed.data.next);

  if (!hasSupabasePublicConfig()) {
    revalidatePath("/items");
    revalidatePath(`/items/${parsed.data.itemId}`);
    return {
      ok: true,
      message: "Guardado en demo local.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    redirect(`/auth?next=${encodeURIComponent(nextPath)}`);
  }

  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("id,owner_id,status,moderation_status")
    .eq("id", parsed.data.itemId)
    .maybeSingle();

  if (itemError || !item) {
    return {
      ok: false,
      message: "No encontramos esta publicación.",
    };
  }

  if (item.owner_id === userId) {
    return {
      ok: false,
      message: "No puedes guardar tu propia publicación.",
    };
  }

  const { data: existing, error: existingError } = await supabase
    .from("saved_items")
    .select("id")
    .eq("user_id", userId)
    .eq("item_id", parsed.data.itemId)
    .maybeSingle();

  if (existingError) {
    return {
      ok: false,
      message: getSavedItemsErrorMessage(existingError.message),
    };
  }

  if (existing?.id) {
    const { error } = await supabase
      .from("saved_items")
      .delete()
      .eq("id", existing.id)
      .eq("user_id", userId);

    if (error) {
      return {
        ok: false,
        message: getSavedItemsErrorMessage(error.message),
      };
    }

    revalidatePath("/items");
    revalidatePath(`/items/${parsed.data.itemId}`);
    revalidatePath("/", "layout");

    return {
      ok: true,
      message: "Quitado de guardados.",
      saved: false,
    };
  } else if (item.status === "active" && item.moderation_status === "active") {
    const { error } = await supabase.from("saved_items").insert({
      user_id: userId,
      item_id: parsed.data.itemId,
    });

    if (error) {
      return {
        ok: false,
        message: getSavedItemsErrorMessage(error.message),
      };
    }

    revalidatePath("/items");
    revalidatePath(`/items/${parsed.data.itemId}`);
    revalidatePath("/", "layout");

    return {
      ok: true,
      message: "Guardado.",
      saved: true,
    };
  }

  return {
    ok: false,
    message: "Solo puedes guardar publicaciones activas.",
  };
}

export async function updateTradeRequestStatusAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return updateTradeRequestStatus(formData);
}

export async function updateTradeRequestStatusFormAction(formData: FormData) {
  await updateTradeRequestStatus(formData);
}

async function updateTradeRequestStatus(formData: FormData): Promise<ActionState> {
  if (!hasSupabasePublicConfig()) {
    return {
      ok: false,
      message: "Falta conectar Supabase para actualizar solicitudes reales.",
    };
  }

  const parsed = tradeRequestStatusSchema.safeParse({
    tradeRequestId: formData.get("tradeRequestId"),
    status: formData.get("status"),
    rejectionReason: optionalFormString(formData.get("rejectionReason")),
    acknowledgeCancellation: optionalFormString(formData.get("acknowledgeCancellation")),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "No se pudo actualizar la solicitud.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    return {
      ok: false,
      message: "Inicia sesión para responder esta solicitud.",
    };
  }

  const { data: tradeRequest, error: requestError } = await supabase
    .from("trade_requests")
    .select("id,requester_id,receiver_id,requested_item_id,status")
    .eq("id", parsed.data.tradeRequestId)
    .maybeSingle();

  if (requestError || !tradeRequest) {
    return {
      ok: false,
      message: "Solicitud no encontrada.",
    };
  }

  const requesterId = String(tradeRequest.requester_id);
  const receiverId = String(tradeRequest.receiver_id);
  const currentStatus = String(tradeRequest.status);
  const isRequester = requesterId === userId;
  const isReceiver = receiverId === userId;

  if (["accepted", "rejected"].includes(parsed.data.status) && !isReceiver) {
    return {
      ok: false,
      message: "Solo quien recibió la solicitud puede aceptarla o rechazarla.",
    };
  }

  if (["accepted", "rejected"].includes(parsed.data.status)
    && !["pending", "countered"].includes(currentStatus)) {
    return {
      ok: false,
      message: "Esta solicitud ya no está pendiente.",
    };
  }

  if (parsed.data.status === "cancelled") {
    if (!["pending", "countered", "accepted"].includes(currentStatus)) {
      return {
        ok: false,
        message: "Esta solicitud o negociación ya terminó.",
      };
    }

    let hasCompletionConfirmation = false;

    if (currentStatus === "accepted") {
      const { count, error: confirmationError } = await supabase
        .from("trade_completion_confirmations")
        .select("id", { count: "exact", head: true })
        .eq("trade_request_id", parsed.data.tradeRequestId);

      if (confirmationError) {
        return {
          ok: false,
          message: "No se pudo comprobar el estado de la negociación.",
        };
      }

      hasCompletionConfirmation = (count ?? 0) > 0;
    }

    if (!canCancelTradeRequest({
      status: currentStatus as TradeRequestStatus,
      isRequester,
      isReceiver,
      hasCompletionConfirmation,
    })) {
      return {
        ok: false,
        message: hasCompletionConfirmation
          ? "La negociación ya tiene una confirmación de intercambio y no se puede cancelar."
          : "No puedes cancelar esta solicitud o negociación.",
      };
    }

    if (
      currentStatus === "accepted"
      && parsed.data.acknowledgeCancellation !== "on"
    ) {
      return {
        ok: false,
        message: "Confirma que el intercambio no se realizó antes de terminar la negociación.",
      };
    }
  }

  if (parsed.data.status === "accepted") {
    const { data: offeredRows, error: offeredError } = await supabase
      .from("trade_request_offered_items")
      .select("item_id")
      .eq("trade_request_id", parsed.data.tradeRequestId);
    const involvedItemIds = [
      String(tradeRequest.requested_item_id),
      ...(offeredRows ?? []).map((row) => String(row.item_id)),
    ].filter(Boolean);
    const { data: involvedItems, error: itemsError } = await supabase
      .from("items")
      .select("id,status,moderation_status")
      .in("id", involvedItemIds);

    if (
      offeredError
      || itemsError
      || involvedItems?.length !== involvedItemIds.length
      || !canCompleteTradeRequest(
        (involvedItems ?? []).map((item) => ({
          status: item.status as ItemStatus,
          moderationStatus: item.moderation_status as Item["moderationStatus"],
        })),
      )
    ) {
      return {
        ok: false,
        message: "No se puede aceptar: algún artículo de la propuesta ya no está disponible.",
      };
    }
  }

  if (parsed.data.status === "completed") {
    const { data, error } = await supabase.rpc("confirm_trade_request_completion", {
      p_trade_request_id: parsed.data.tradeRequestId,
    });

    if (error) {
      return {
        ok: false,
        message: getPublicDatabaseErrorMessage(
          error,
          "No se pudo guardar la confirmacion del trueque.",
        ),
      };
    }

    revalidatePath("/requests");
    revalidatePath(`/requests/${parsed.data.tradeRequestId}`);
    revalidatePath("/profile");
    revalidatePath("/", "layout");

    return {
      ok: true,
      message: data === "completed"
        ? "Trueque completado. Ambas personas confirmaron que sí se hizo."
        : "Confirmación guardada. Falta que la otra persona confirme que sí se hizo.",
    };
  } else {
    const { error } = await supabase
      .from("trade_requests")
      .update({
        status: parsed.data.status,
        rejection_reason: parsed.data.status === "rejected"
          ? emptyToNull(parsed.data.rejectionReason)
          : null,
      })
      .eq("id", parsed.data.tradeRequestId);

    if (error) {
      return {
        ok: false,
        message: getPublicDatabaseErrorMessage(
          error,
          "No se pudo actualizar la solicitud.",
        ),
      };
    }
  }

  revalidatePath("/requests");
  revalidatePath(`/requests/${parsed.data.tradeRequestId}`);
  revalidatePath("/", "layout");

  return {
    ok: true,
    message: parsed.data.status === "cancelled" && currentStatus === "accepted"
      ? "Negociación terminada. El trueque no cuenta como realizado y los artículos vuelven a estar disponibles."
      : getTradeRequestStatusMessage(parsed.data.status),
  };
}

export async function createCounterofferAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!hasSupabasePublicConfig()) {
    return {
      ok: false,
      message: "Falta conectar Supabase para guardar contraofertas reales.",
    };
  }

  const parsed = createCounterofferSchema.safeParse({
    tradeRequestId: formData.get("tradeRequestId"),
    requestedOfferedItemIds: formData.getAll("requestedOfferedItemIds"),
    message: optionalFormString(formData.get("message")),
    acknowledgeNoManagedExchange: formData.get("acknowledgeNoManagedExchange"),
  });

  if (!parsed.success) {
    const mustConfirmRule = parsed.error.issues.some((issue) =>
      issue.path.includes("acknowledgeNoManagedExchange"),
    );

    return {
      ok: false,
      message: mustConfirmRule
        ? "Confirma que Trueka no maneja pagos, envíos ni entregas."
        : "Elige al menos un artículo para pedir en la contraoferta.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user?.id) {
    return {
      ok: false,
      message: "Inicia sesión para crear una contraoferta.",
    };
  }

  const { data: counterofferId, error } = await supabase.rpc("create_trade_counteroffer", {
    p_trade_request_id: parsed.data.tradeRequestId,
    p_requested_offered_item_ids: parsed.data.requestedOfferedItemIds,
    p_message: parsed.data.message ?? null,
  });

  if (error) {
    return {
      ok: false,
      message: getPublicDatabaseErrorMessage(
        error,
        "No se pudo crear la contraoferta.",
      ),
    };
  }

  revalidatePath("/requests");
  revalidatePath(`/requests/${parsed.data.tradeRequestId}`);
  revalidatePath("/", "layout");

  return {
    ok: true,
    message: "Contraoferta enviada.",
    href: typeof counterofferId === "string" ? `/requests/${parsed.data.tradeRequestId}` : undefined,
  };
}

export async function respondCounterofferAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!hasSupabasePublicConfig()) {
    return {
      ok: false,
      message: "Falta conectar Supabase para responder contraofertas reales.",
    };
  }

  const parsed = respondCounterofferSchema.safeParse({
    counterofferId: formData.get("counterofferId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "No se pudo responder la contraoferta.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user?.id) {
    return {
      ok: false,
      message: "Inicia sesión para responder la contraoferta.",
    };
  }

  const { data: counteroffer } = await supabase
    .from("trade_counteroffers")
    .select("trade_request_id")
    .eq("id", parsed.data.counterofferId)
    .maybeSingle();
  const { error } = await supabase.rpc("respond_trade_counteroffer", {
    p_counteroffer_id: parsed.data.counterofferId,
    p_status: parsed.data.status,
  });

  if (error) {
    return {
      ok: false,
      message: getPublicDatabaseErrorMessage(
        error,
        "No se pudo responder la contraoferta.",
      ),
    };
  }

  const requestId = typeof counteroffer?.trade_request_id === "string"
    ? counteroffer.trade_request_id
    : undefined;

  revalidatePath("/requests");

  if (requestId) {
    revalidatePath(`/requests/${requestId}`);
  }

  revalidatePath("/", "layout");

  return {
    ok: true,
    message: parsed.data.status === "accepted"
      ? "Contraoferta aceptada. La solicitud queda en negociación y se habilita el chat."
      : "Contraoferta rechazada.",
  };
}

export async function openNotificationAction(formData: FormData) {
  const parsed = notificationSchema.safeParse({
    notificationId: formData.get("notificationId"),
    href: formData.get("href"),
  });

  if (!parsed.success) {
    redirect("/requests");
  }

  const href = normalizeInternalNext(parsed.data.href);

  if (hasSupabasePublicConfig()) {
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (userId) {
      const readAt = new Date().toISOString();
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: readAt, seen_at: readAt })
        .eq("id", parsed.data.notificationId)
        .eq("recipient_id", userId);

      if (error) {
        await supabase
          .from("notifications")
          .update({ read_at: readAt })
          .eq("id", parsed.data.notificationId)
          .eq("recipient_id", userId);
      }
    }
  }

  revalidatePath("/", "layout");
  revalidatePath("/notifications");
  redirect(href);
}

export async function getNotificationsSnapshotAction() {
  const supabase = hasSupabasePublicConfig() ? await createSupabaseServerClient() : null;
  const userId = supabase ? (await supabase.auth.getUser()).data.user?.id : undefined;

  if (hasSupabasePublicConfig() && !userId) {
    return {
      notifications: [],
      unreadCount: 0,
    };
  }

  const [notifications, unreadCount] = await Promise.all([
    getNotificationsForCurrentUser(),
    getUnreadNotificationCount(userId),
  ]);

  return {
    notifications,
    unreadCount,
  };
}

export async function markNotificationsSeenAction() {
  if (!hasSupabasePublicConfig()) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    return;
  }

  const { error } = await supabase
    .from("notifications")
    .update({ seen_at: new Date().toISOString() })
    .eq("recipient_id", userId)
    .is("seen_at", null);

  if (!error) {
    revalidatePath("/", "layout");
  }
}

export async function markAllNotificationsReadAction() {
  if (!hasSupabasePublicConfig()) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    return;
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString(), seen_at: new Date().toISOString() })
    .eq("recipient_id", userId)
    .is("read_at", null);

  if (error) {
    const { error: fallbackError } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", userId)
      .is("read_at", null);

    if (!fallbackError) {
      revalidatePath("/notifications");
      revalidatePath("/", "layout");
    }

    return;
  }

  if (!error) {
    revalidatePath("/notifications");
    revalidatePath("/", "layout");
  }
}

export async function reportContentAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = reportSchema.safeParse({
    reportedUserId: optionalFormString(formData.get("reportedUserId")),
    reportedItemId: optionalFormString(formData.get("reportedItemId")),
    tradeRequestId: optionalFormString(formData.get("tradeRequestId")),
    reason: formData.get("reason"),
    details: optionalFormString(formData.get("details")),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisa el motivo del reporte.",
    };
  }

  if (!parsed.data.reportedUserId && !parsed.data.reportedItemId && !parsed.data.tradeRequestId) {
    return {
      ok: false,
      message: "No encontramos qué reportar.",
    };
  }

  if (!hasSupabasePublicConfig()) {
    return {
      ok: true,
      message: "Reporte registrado en demo local.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    return {
      ok: false,
      message: "Inicia sesión para enviar un reporte.",
    };
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: userId,
    reported_user_id: emptyToNull(parsed.data.reportedUserId),
    reported_item_id: emptyToNull(parsed.data.reportedItemId),
    trade_request_id: emptyToNull(parsed.data.tradeRequestId),
    reason: parsed.data.reason,
    details: emptyToNull(parsed.data.details),
  });

  if (error) {
    return {
      ok: false,
      message: getPublicDatabaseErrorMessage(
        error,
        "No se pudo enviar el reporte. Intenta de nuevo.",
      ),
    };
  }

  revalidatePath("/admin");

  return {
    ok: true,
    message: "Reporte enviado. Gracias por ayudar a cuidar Trueka.",
  };
}

export async function requestDataDeletionAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = dataDeletionRequestSchema.safeParse({
    email: formData.get("email"),
    provider: formData.get("provider"),
    details: optionalFormString(formData.get("details")),
    acknowledgeManualReview: formData.get("acknowledgeManualReview"),
  });

  if (!parsed.success) {
    const mustConfirmManualReview = parsed.error.issues.some((issue) =>
      issue.path.includes("acknowledgeManualReview"),
    );

    return {
      ok: false,
      message: mustConfirmManualReview
        ? "Confirma que la solicitud sera revisada manualmente antes de procesarse."
        : (parsed.error.issues[0]?.message ?? "Revisa los datos de la solicitud."),
    };
  }

  if (!hasSupabasePublicConfig()) {
    return {
      ok: true,
      message: "Solicitud registrada en demo local.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    return {
      ok: false,
      message: "Inicia sesion para solicitar eliminacion de datos.",
    };
  }

  const { data: existingRequest, error: existingError } = await supabase
    .from("data_deletion_requests")
    .select("id,status")
    .eq("user_id", userId)
    .in("status", ["open", "reviewing"])
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return {
      ok: false,
      message: getDataDeletionRequestErrorMessage(existingError.message)
        ?? "No se pudo revisar tu solicitud de eliminacion.",
    };
  }

  if (existingRequest) {
    return {
      ok: true,
      message: "Ya tienes una solicitud abierta o en revision. Te avisaremos cuando avance.",
    };
  }

  const { error } = await supabase.from("data_deletion_requests").insert({
    user_id: userId,
    email: parsed.data.email,
    provider: parsed.data.provider,
    details: emptyToNull(parsed.data.details),
  });

  if (error) {
    return {
      ok: false,
      message: getDataDeletionRequestErrorMessage(error.message)
        ?? getPublicDatabaseErrorMessage(
          error,
          "No se pudo registrar la solicitud de eliminacion.",
        ),
    };
  }

  revalidatePath("/legal/eliminacion-datos");
  revalidatePath("/admin");
  revalidatePath("/", "layout");

  return {
    ok: true,
    message: "Solicitud enviada. Te avisaremos cuando sea revisada.",
  };
}

export async function blockUserAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = blockUserSchema.safeParse({
    blockedUserId: formData.get("blockedUserId"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "No encontramos a quién bloquear.",
    };
  }

  if (!hasSupabasePublicConfig()) {
    return {
      ok: true,
      message: "Usuario bloqueado en demo local.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    return {
      ok: false,
      message: "Inicia sesión para bloquear usuarios.",
    };
  }

  if (userId === parsed.data.blockedUserId) {
    return {
      ok: false,
      message: "No puedes bloquearte a ti mismo.",
    };
  }

  const { error } = await supabase.from("blocks").upsert(
    {
      blocker_id: userId,
      blocked_id: parsed.data.blockedUserId,
    },
    {
      onConflict: "blocker_id,blocked_id",
    },
  );

  if (error) {
    return {
      ok: false,
      message: getPublicDatabaseErrorMessage(
        error,
        "No se pudo bloquear a esta persona.",
      ),
    };
  }

  revalidatePath("/items");
  revalidatePath("/requests");
  revalidatePath("/profile");
  revalidatePath(`/users/${parsed.data.blockedUserId}`);

  return {
    ok: true,
    message: "Usuario bloqueado. Ya no podrá interactuar contigo.",
  };
}

export async function unblockUserAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = blockUserSchema.safeParse({
    blockedUserId: formData.get("blockedUserId"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "No encontramos a quién desbloquear.",
    };
  }

  if (!hasSupabasePublicConfig()) {
    return {
      ok: true,
      message: "Usuario desbloqueado en demo local.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    return {
      ok: false,
      message: "Inicia sesión para desbloquear usuarios.",
    };
  }

  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", userId)
    .eq("blocked_id", parsed.data.blockedUserId);

  if (error) {
    return {
      ok: false,
      message: getPublicDatabaseErrorMessage(
        error,
        "No se pudo desbloquear a esta persona.",
      ),
    };
  }

  revalidatePath("/items");
  revalidatePath("/requests");
  revalidatePath("/profile");
  revalidatePath(`/users/${parsed.data.blockedUserId}`);

  return {
    ok: true,
    message: "Usuario desbloqueado.",
  };
}

export async function rateTradeRequestAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = tradeRatingSchema.safeParse({
    tradeRequestId: formData.get("tradeRequestId"),
    reviewedUserId: formData.get("reviewedUserId"),
    itemDescriptionRating: formData.get("itemDescriptionRating"),
    communicationRating: formData.get("communicationRating"),
    fairExchangeRating: formData.get("fairExchangeRating"),
    reliabilityRating: formData.get("reliabilityRating"),
    reviewTags: formData.getAll("reviewTags").map(String),
    comment: optionalFormString(formData.get("comment")),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Elige una calificación de 1 a 5 en cada criterio.",
    };
  }

  const overallRating = Math.round((
    parsed.data.itemDescriptionRating
    + parsed.data.communicationRating
    + parsed.data.fairExchangeRating
    + parsed.data.reliabilityRating
  ) / 4);

  if (!hasSupabasePublicConfig()) {
    return {
      ok: true,
      message: "Calificación guardada en demo local.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    return {
      ok: false,
      message: "Inicia sesión para calificar.",
    };
  }

  if (userId === parsed.data.reviewedUserId) {
    return {
      ok: false,
      message: "No puedes calificarte a ti mismo.",
    };
  }

  const { data: tradeRequest, error: requestError } = await supabase
    .from("trade_requests")
    .select("id,requester_id,receiver_id,status")
    .eq("id", parsed.data.tradeRequestId)
    .maybeSingle();

  if (requestError || !tradeRequest) {
    return {
      ok: false,
      message: "Solicitud no encontrada.",
    };
  }

  const participantIds = [
    String(tradeRequest.requester_id),
    String(tradeRequest.receiver_id),
  ];

  if (String(tradeRequest.status) !== "completed") {
    return {
      ok: false,
      message: "Solo puedes calificar cuando el trueque ya quedó completado.",
    };
  }

  if (!participantIds.includes(userId) || !participantIds.includes(parsed.data.reviewedUserId)) {
    return {
      ok: false,
      message: "Solo participantes del trueque pueden calificar.",
    };
  }

  const { data: existingRating } = await supabase
    .from("ratings")
    .select("id")
    .eq("trade_request_id", parsed.data.tradeRequestId)
    .eq("reviewer_id", userId)
    .maybeSingle();

  if (existingRating?.id) {
    return {
      ok: false,
      message: "Ya calificaste este trueque.",
    };
  }

  const { error } = await supabase.from("ratings").insert({
    trade_request_id: parsed.data.tradeRequestId,
    reviewer_id: userId,
    reviewed_id: parsed.data.reviewedUserId,
    rating: overallRating,
    comment: emptyToNull(parsed.data.comment),
    item_matched_description: parsed.data.itemDescriptionRating >= 4,
    user_was_reliable: parsed.data.reliabilityRating >= 4,
    item_description_rating: parsed.data.itemDescriptionRating,
    communication_rating: parsed.data.communicationRating,
    fair_exchange_rating: parsed.data.fairExchangeRating,
    reliability_rating: parsed.data.reliabilityRating,
    review_tags: parsed.data.reviewTags,
  });

  if (error) {
    return {
      ok: false,
      message: getPublicDatabaseErrorMessage(
        error,
        "No se pudo guardar la calificacion.",
      ),
    };
  }

  revalidatePath(`/requests/${parsed.data.tradeRequestId}`);
  revalidatePath(`/users/${parsed.data.reviewedUserId}`);
  revalidatePath("/requests");
  revalidatePath("/", "layout");

  return {
    ok: true,
    message: "Calificación guardada. Gracias por ayudar a construir confianza en Trueka.",
  };
}

export async function updateProfileAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!hasSupabasePublicConfig()) {
    return {
      ok: false,
      message: "Falta conectar Supabase para guardar el perfil real.",
    };
  }

  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    city: formData.get("city"),
    state: formData.get("state"),
    postalCode: formData.get("postalCode"),
    bio: formData.get("bio"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisa nombre, ciudad, estado, codigo postal y bio.",
    };
  }

  const canonicalCity = getCanonicalMunicipalityName(parsed.data.state, parsed.data.city);

  if (!isValidStateMunicipality(parsed.data.state, canonicalCity)) {
    return {
      ok: false,
      message: "Elige un estado y municipio válidos.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    return {
      ok: false,
      message: "Inicia sesión para editar tu perfil.",
    };
  }

  const avatar = formData.get("avatar");
  const avatarFile = avatar instanceof File && avatar.size > 0 ? avatar : null;
  let avatarUrl: string | undefined;
  let avatarPath: string | undefined;

  if (avatarFile) {
    if (avatarFile.size > maxAvatarSizeBytes) {
      return {
        ok: false,
        message: `La foto "${avatarFile.name}" pesa más de 3 MB. Elige una imagen más ligera.`,
      };
    }

    if (!avatarFile.type.startsWith("image/")) {
      return {
        ok: false,
        message: "La foto de perfil debe ser una imagen.",
      };
    }

    const path = `${userId}/${crypto.randomUUID()}-${safeFileName(avatarFile.name)}`;
    const { data: uploaded, error: uploadError } = await supabase.storage
      .from("profile-avatars")
      .upload(path, avatarFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError || !uploaded) {
      return {
        ok: false,
        message: "No se pudo subir la foto de perfil. Revisa el formato y el tamano.",
      };
    }

    avatarPath = uploaded.path;
    avatarUrl = getProtectedMediaUrl("profile-avatars", uploaded.path);
  }

  const { error } = await supabase.rpc("update_my_profile", {
    p_display_name: parsed.data.displayName,
    p_city: canonicalCity,
    p_state: parsed.data.state,
    p_postal_code: emptyToNull(parsed.data.postalCode),
    p_bio: emptyToNull(parsed.data.bio),
    p_avatar_url: avatarUrl ?? null,
    p_complete_onboarding: false,
  });

  if (error) {
    if (avatarPath) {
      await supabase.storage.from("profile-avatars").remove([avatarPath]);
    }

    return {
      ok: false,
      message: getPostalCodePersistenceErrorMessage(error.message)
        ?? getPublicDatabaseErrorMessage(
          error,
          "No se pudieron guardar los cambios del perfil.",
        ),
    };
  }

  if (formData.get("managePrivateInterestTags") === "on") {
    const privateTagSlugs = Array.from(
      new Set(formData.getAll("privateInterestTags").map(String).filter(Boolean)),
    ).slice(0, 12);
    const interestError = await replaceProfilePrivateInterestTags(supabase, userId, privateTagSlugs);

    if (interestError) {
      return {
        ok: false,
        message: interestError,
      };
    }
  }

  revalidatePath("/profile");
  revalidatePath(`/users/${userId}`);
  revalidatePath("/", "layout");

  return {
    ok: true,
    message: "Perfil actualizado.",
  };
}

export async function startPhoneVerificationAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!hasSupabasePublicConfig()) {
    return {
      ok: false,
      message: "Falta conectar Supabase para verificar teléfono.",
    };
  }

  const parsed = phoneVerificationRequestSchema.safeParse({
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Escribe un teléfono válido.",
    };
  }

  const normalizedPhone = normalizePhoneNumber(parsed.data.phone);

  if (!normalizedPhone) {
    return {
      ok: false,
      message: "Escribe un teléfono con lada. Ejemplo: +523312345678.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    return {
      ok: false,
      message: "Inicia sesión para verificar tu teléfono.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    phone: normalizedPhone,
  });

  if (error) {
    return {
      ok: false,
      message: getPhoneVerificationErrorMessage(error.message),
    };
  }

  const { error: profileError } = await supabase.rpc("sync_my_phone_verification");

  if (profileError) {
    return {
      ok: false,
      message: getPhoneVerificationErrorMessage(profileError.message),
    };
  }

  revalidatePath("/profile");

  return {
    ok: true,
    message: "Código enviado. Revisa tu SMS y escríbelo para confirmar el teléfono.",
  };
}

export async function confirmPhoneVerificationAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!hasSupabasePublicConfig()) {
    return {
      ok: false,
      message: "Falta conectar Supabase para verificar teléfono.",
    };
  }

  const parsed = phoneVerificationConfirmSchema.safeParse({
    phone: formData.get("phone"),
    token: formData.get("token"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Escribe el teléfono y el código recibido.",
    };
  }

  const normalizedPhone = normalizePhoneNumber(parsed.data.phone);
  const token = parsed.data.token.replace(/\s+/g, "");

  if (!normalizedPhone) {
    return {
      ok: false,
      message: "Escribe un teléfono con lada. Ejemplo: +523312345678.",
    };
  }

  if (!/^[0-9]{4,10}$/.test(token)) {
    return {
      ok: false,
      message: "El código debe contener sólo números.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    return {
      ok: false,
      message: "Inicia sesión para verificar tu teléfono.",
    };
  }

  const { error } = await supabase.auth.verifyOtp({
    phone: normalizedPhone,
    token,
    type: "phone_change",
  });

  if (error) {
    return {
      ok: false,
      message: getPhoneVerificationErrorMessage(error.message),
    };
  }

  const { error: profileError } = await supabase.rpc("sync_my_phone_verification");

  if (profileError) {
    return {
      ok: false,
      message: getPhoneVerificationErrorMessage(profileError.message),
    };
  }

  revalidatePath("/profile");
  revalidatePath(`/users/${userId}`);
  revalidatePath("/", "layout");

  return {
    ok: true,
    message: "Teléfono verificado. Ya aparece como señal de confianza.",
  };
}

export async function completeOnboardingAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!hasSupabasePublicConfig()) {
    return {
      ok: false,
      message: "Falta conectar Supabase para completar el perfil real.",
    };
  }

  const parsed = onboardingSchema.safeParse({
    displayName: formData.get("displayName"),
    city: formData.get("city"),
    state: formData.get("state"),
    postalCode: formData.get("postalCode"),
    bio: formData.get("bio"),
    next: formData.get("next"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisa nombre, municipio, estado, codigo postal y bio.",
    };
  }

  const privateTagSlugs = Array.from(
    new Set(formData.getAll("privateInterestTags").map(String).filter(Boolean)),
  ).slice(0, 12);

  if (privateTagSlugs.length === 0) {
    return {
      ok: false,
      message: "Elige al menos un interés para mejorar tus matches.",
    };
  }

  const canonicalCity = getCanonicalMunicipalityName(parsed.data.state, parsed.data.city);

  if (!isValidStateMunicipality(parsed.data.state, canonicalCity)) {
    return {
      ok: false,
      message: "Elige un estado y municipio válidos.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    return {
      ok: false,
      message: "Inicia sesión para completar tu perfil.",
    };
  }

  const avatar = formData.get("avatar");
  const avatarFile = avatar instanceof File && avatar.size > 0 ? avatar : null;
  let avatarUrl: string | undefined;
  let avatarPath: string | undefined;

  if (avatarFile) {
    if (avatarFile.size > maxAvatarSizeBytes) {
      return {
        ok: false,
        message: `La foto "${avatarFile.name}" pesa más de 3 MB. Elige una imagen más ligera.`,
      };
    }

    if (!avatarFile.type.startsWith("image/")) {
      return {
        ok: false,
        message: "La foto de perfil debe ser una imagen.",
      };
    }

    const path = `${userId}/${crypto.randomUUID()}-${safeFileName(avatarFile.name)}`;
    const { data: uploaded, error: uploadError } = await supabase.storage
      .from("profile-avatars")
      .upload(path, avatarFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError || !uploaded) {
      return {
        ok: false,
        message: "No se pudo subir la foto de perfil. Revisa el formato y el tamano.",
      };
    }

    avatarPath = uploaded.path;
    avatarUrl = getProtectedMediaUrl("profile-avatars", uploaded.path);
  }

  const { error } = await supabase.rpc("update_my_profile", {
    p_display_name: parsed.data.displayName,
    p_city: canonicalCity,
    p_state: parsed.data.state,
    p_postal_code: emptyToNull(parsed.data.postalCode),
    p_bio: emptyToNull(parsed.data.bio),
    p_avatar_url: avatarUrl ?? null,
    p_complete_onboarding: true,
  });

  if (error) {
    if (avatarPath) {
      await supabase.storage.from("profile-avatars").remove([avatarPath]);
    }

    return {
      ok: false,
      message: getPostalCodePersistenceErrorMessage(error.message) ?? getOnboardingErrorMessage(error.message),
    };
  }

  const interestError = await replaceProfilePrivateInterestTags(supabase, userId, privateTagSlugs);

  if (interestError) {
    return {
      ok: false,
      message: interestError,
    };
  }

  revalidatePath("/");
  revalidatePath("/items");
  revalidatePath("/profile");
  revalidatePath("/", "layout");

  return {
    ok: true,
    message: "Perfil listo. Ya puedes explorar matches mejor filtrados.",
    href: normalizeInternalNext(parsed.data.next),
  };
}

export async function adminModerationAction(formData: FormData) {
  if (!hasSupabasePublicConfig()) {
    return;
  }

  const parsed = adminActionSchema.safeParse({
    intent: formData.get("intent"),
    itemId: formData.get("itemId") || undefined,
    userId: formData.get("userId") || undefined,
    reportId: formData.get("reportId") || undefined,
    dataDeletionRequestId: formData.get("dataDeletionRequestId") || undefined,
    adminNotes: formData.get("adminNotes") || undefined,
  });

  if (!parsed.success) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.is_admin !== true) {
    return;
  }

  let resolvedReport = false;
  const note = emptyToNull(parsed.data.adminNotes);

  if (parsed.data.intent === "approve_item" && parsed.data.itemId) {
    const { data: item } = await supabase
      .from("items")
      .select("id,status,moderation_status")
      .eq("id", parsed.data.itemId)
      .maybeSingle();

    if (item) {
      const previousItemStatus = getRecordString(item, "status");
      const previousItemModerationStatus = getRecordString(item, "moderation_status");
      const { error } = await supabase
        .from("items")
        .update({
          status: "active",
          moderation_status: "active",
        })
        .eq("id", parsed.data.itemId);

      if (!error) {
        await supabase
          .from("item_moderation_reviews")
          .update({
            status: "approved",
            admin_notes: note,
            reviewed_by: userId,
            reviewed_at: new Date().toISOString(),
          })
          .eq("item_id", parsed.data.itemId)
          .in("status", ["open", "reviewing"]);
        await recordAdminModerationAction(supabase, {
          action: "approve_item",
          adminId: userId,
          targetItemId: parsed.data.itemId,
          previousItemStatus,
          nextItemStatus: "active",
          previousItemModerationStatus,
          nextItemModerationStatus: "active",
          note,
        });
        await supabase.rpc("notify_item_interest_matches", {
          p_item_id: parsed.data.itemId,
        });
      }
    }
  }

  if (parsed.data.intent === "reject_item" && parsed.data.itemId) {
    const { data: item } = await supabase
      .from("items")
      .select("id,status,moderation_status")
      .eq("id", parsed.data.itemId)
      .maybeSingle();

    if (item) {
      const previousItemStatus = getRecordString(item, "status");
      const previousItemModerationStatus = getRecordString(item, "moderation_status");
      const { error } = await supabase
        .from("items")
        .update({
          status: "hidden_by_admin",
          moderation_status: "rejected",
        })
        .eq("id", parsed.data.itemId);

      if (!error) {
        await supabase
          .from("item_moderation_reviews")
          .update({
            status: "rejected",
            admin_notes: note,
            reviewed_by: userId,
            reviewed_at: new Date().toISOString(),
          })
          .eq("item_id", parsed.data.itemId)
          .in("status", ["open", "reviewing"]);
        await recordAdminModerationAction(supabase, {
          action: "reject_item",
          adminId: userId,
          targetItemId: parsed.data.itemId,
          previousItemStatus,
          nextItemStatus: "hidden_by_admin",
          previousItemModerationStatus,
          nextItemModerationStatus: "rejected",
          note,
        });
      }
    }
  }

  if (parsed.data.intent === "hide_item" && parsed.data.itemId) {
    const { data: item } = await supabase
      .from("items")
      .select("id,status,moderation_status")
      .eq("id", parsed.data.itemId)
      .maybeSingle();

    if (item) {
      const previousItemStatus = getRecordString(item, "status");
      const previousItemModerationStatus = getRecordString(item, "moderation_status");
      const { error } = await supabase
        .from("items")
        .update({
          status: "hidden_by_admin",
          moderation_status: "hidden_by_admin",
        })
        .eq("id", parsed.data.itemId);

      if (!error) {
        resolvedReport = true;
        await recordAdminModerationAction(supabase, {
          action: "hide_item",
          adminId: userId,
          reportId: parsed.data.reportId,
          targetItemId: parsed.data.itemId,
          previousItemStatus,
          nextItemStatus: "hidden_by_admin",
          previousItemModerationStatus,
          nextItemModerationStatus: "hidden_by_admin",
          note,
        });
      }
    }
  }

  if (parsed.data.intent === "restore_item" && parsed.data.itemId) {
    const [{ data: item }, { data: lastHide }] = await Promise.all([
      supabase
        .from("items")
        .select("id,status,moderation_status")
        .eq("id", parsed.data.itemId)
        .maybeSingle(),
      supabase
        .from("admin_moderation_actions")
        .select("previous_item_status,previous_item_moderation_status")
        .eq("target_item_id", parsed.data.itemId)
        .eq("action", "hide_item")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (item) {
      const previousItemStatus = getRecordString(item, "status");
      const previousItemModerationStatus = getRecordString(item, "moderation_status");
      const restoredState = getRestoredItemState({
        previousItemStatus: getRecordString(lastHide, "previous_item_status"),
        previousItemModerationStatus: getRecordString(lastHide, "previous_item_moderation_status"),
      });
      const { error } = await supabase
        .from("items")
        .update({
          status: restoredState.status,
          moderation_status: restoredState.moderationStatus,
        })
        .eq("id", parsed.data.itemId);

      if (!error) {
        await recordAdminModerationAction(supabase, {
          action: "restore_item",
          adminId: userId,
          reportId: parsed.data.reportId,
          targetItemId: parsed.data.itemId,
          previousItemStatus,
          nextItemStatus: restoredState.status,
          previousItemModerationStatus,
          nextItemModerationStatus: restoredState.moderationStatus,
          note,
        });
      }
    }
  }

  if (parsed.data.intent === "ban_user" && parsed.data.userId) {
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("id,is_banned,is_admin")
      .eq("id", parsed.data.userId)
      .maybeSingle();

    if (targetProfile && getRecordBoolean(targetProfile, "is_admin") !== true) {
      const previousUserBanned = getRecordBoolean(targetProfile, "is_banned");
      const { error } = await supabase
        .from("profiles")
        .update({
          is_banned: true,
        })
        .eq("id", parsed.data.userId);

      if (!error) {
        resolvedReport = true;
        await recordAdminModerationAction(supabase, {
          action: "ban_user",
          adminId: userId,
          reportId: parsed.data.reportId,
          targetUserId: parsed.data.userId,
          previousUserBanned,
          nextUserBanned: true,
          note,
        });
      }
    }
  }

  if (parsed.data.intent === "unban_user" && parsed.data.userId) {
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("id,is_banned")
      .eq("id", parsed.data.userId)
      .maybeSingle();

    if (targetProfile) {
      const previousUserBanned = getRecordBoolean(targetProfile, "is_banned");
      const { error } = await supabase
        .from("profiles")
        .update({
          is_banned: false,
        })
        .eq("id", parsed.data.userId);

      if (!error) {
        await recordAdminModerationAction(supabase, {
          action: "unban_user",
          adminId: userId,
          reportId: parsed.data.reportId,
          targetUserId: parsed.data.userId,
          previousUserBanned,
          nextUserBanned: false,
          note,
        });
      }
    }
  }

  if (parsed.data.intent === "review_report" && parsed.data.reportId) {
    const { error } = await supabase
      .from("reports")
      .update({
        status: "reviewing",
        admin_notes: note,
      })
      .eq("id", parsed.data.reportId);

    if (!error) {
      await recordAdminModerationAction(supabase, {
        action: "review_report",
        adminId: userId,
        reportId: parsed.data.reportId,
        note,
      });
    }
  }

  if (parsed.data.intent === "resolve_report" && parsed.data.reportId) {
    const { error } = await supabase
      .from("reports")
      .update({
        status: "resolved",
        admin_notes: note,
      })
      .eq("id", parsed.data.reportId);

    if (!error) {
      await recordAdminModerationAction(supabase, {
        action: "resolve_report",
        adminId: userId,
        reportId: parsed.data.reportId,
        note,
      });
    }
  }

  if (parsed.data.intent === "dismiss_report" && parsed.data.reportId) {
    const { error } = await supabase
      .from("reports")
      .update({
        status: "dismissed",
        admin_notes: note,
      })
      .eq("id", parsed.data.reportId);

    if (!error) {
      await recordAdminModerationAction(supabase, {
        action: "dismiss_report",
        adminId: userId,
        reportId: parsed.data.reportId,
        note,
      });
    }
  }

  if (parsed.data.intent === "update_report_notes" && parsed.data.reportId) {
    const { error } = await supabase
      .from("reports")
      .update({ admin_notes: note })
      .eq("id", parsed.data.reportId);

    if (!error) {
      await recordAdminModerationAction(supabase, {
        action: "update_report_notes",
        adminId: userId,
        reportId: parsed.data.reportId,
        note,
      });
    }
  }

  if (parsed.data.intent === "update_data_deletion_request_notes" && parsed.data.dataDeletionRequestId) {
    await supabase
      .from("data_deletion_requests")
      .update({ admin_notes: note })
      .eq("id", parsed.data.dataDeletionRequestId);
  }

  if (parsed.data.intent === "review_data_deletion_request" && parsed.data.dataDeletionRequestId) {
    await supabase
      .from("data_deletion_requests")
      .update({
        status: "reviewing",
        admin_notes: note,
      })
      .eq("id", parsed.data.dataDeletionRequestId);
  }

  if (parsed.data.intent === "complete_data_deletion_request" && parsed.data.dataDeletionRequestId) {
    await supabase
      .from("data_deletion_requests")
      .update({
        status: "completed",
        admin_notes: note,
        completed_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.dataDeletionRequestId);
  }

  if (parsed.data.intent === "cancel_data_deletion_request" && parsed.data.dataDeletionRequestId) {
    await supabase
      .from("data_deletion_requests")
      .update({
        status: "cancelled",
        admin_notes: note,
      })
      .eq("id", parsed.data.dataDeletionRequestId);
  }

  if (resolvedReport && parsed.data.reportId) {
    await supabase
      .from("reports")
      .update({ status: "resolved" })
      .eq("id", parsed.data.reportId);
  }

  revalidatePath("/admin");
  revalidatePath("/items");
  if (parsed.data.itemId) {
    revalidatePath(`/items/${parsed.data.itemId}`);
  }
  if (parsed.data.userId) {
    revalidatePath(`/users/${parsed.data.userId}`);
  }
  revalidatePath("/legal/eliminacion-datos");
  revalidatePath("/", "layout");
}

type AdminModerationActionInput = {
  adminId: string;
  action: AdminModerationActionName;
  reportId?: string;
  targetUserId?: string;
  targetItemId?: string;
  previousItemStatus?: string;
  nextItemStatus?: string;
  previousItemModerationStatus?: string;
  nextItemModerationStatus?: string;
  previousUserBanned?: boolean;
  nextUserBanned?: boolean;
  note?: string | null;
};

async function recordAdminModerationAction(
  supabase: SupabaseServerClient,
  input: AdminModerationActionInput,
) {
  await supabase.from("admin_moderation_actions").insert({
    admin_id: input.adminId,
    action: input.action,
    report_id: input.reportId ?? null,
    target_user_id: input.targetUserId ?? null,
    target_item_id: input.targetItemId ?? null,
    previous_item_status: input.previousItemStatus ?? null,
    next_item_status: input.nextItemStatus ?? null,
    previous_item_moderation_status: input.previousItemModerationStatus ?? null,
    next_item_moderation_status: input.nextItemModerationStatus ?? null,
    previous_user_banned: input.previousUserBanned ?? null,
    next_user_banned: input.nextUserBanned ?? null,
    note: input.note ?? null,
  });
}

async function createItemModerationReview(
  supabase: SupabaseServerClient,
  input: { itemId: string; openedBy: string; reason: string },
) {
  await supabase.from("item_moderation_reviews").insert({
    item_id: input.itemId,
    opened_by: input.openedBy,
    reason: input.reason || "Posible articulo prohibido.",
  });
}

function getRecordString(value: unknown, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const entry = value as Record<string, unknown>;
  return typeof entry[key] === "string" ? entry[key] : undefined;
}

function getRecordBoolean(value: unknown, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const entry = value as Record<string, unknown>;
  return typeof entry[key] === "boolean" ? entry[key] : undefined;
}

function emptyToNull(value?: string) {
  return value?.trim() ? value.trim() : null;
}

function getPostalCodePersistenceErrorMessage(message?: string | null) {
  const normalizedMessage = message?.toLocaleLowerCase("es-MX") ?? "";

  if (
    normalizedMessage.includes("postal_code")
    || normalizedMessage.includes("profiles_postal_code_format")
    || normalizedMessage.includes("items_postal_code_format")
  ) {
    return "Falta correr la migracion 0020 de codigo postal en Supabase.";
  }

  return null;
}

function getDataDeletionRequestErrorMessage(message?: string | null) {
  const normalizedMessage = message?.toLocaleLowerCase("es-MX") ?? "";

  if (
    normalizedMessage.includes("data_deletion_requests_active_user_idx")
    || normalizedMessage.includes("duplicate key")
    || normalizedMessage.includes("unique constraint")
  ) {
    return "Ya tienes una solicitud abierta o en revision.";
  }

  if (
    normalizedMessage.includes("data_deletion_requests")
    || normalizedMessage.includes("relation")
    || normalizedMessage.includes("column")
  ) {
    return "Falta correr la migracion 0021 de eliminacion de datos en Supabase.";
  }

  return null;
}

function getAuthActionErrorMessage(
  error: { code?: string; message?: string },
  action: "sign-in" | "sign-up",
) {
  const message = error.message?.toLocaleLowerCase("es-MX") ?? "";
  const code = error.code?.toLocaleLowerCase("en-US") ?? "";

  if (
    code.includes("invalid_credentials")
    || message.includes("invalid login")
    || message.includes("invalid credentials")
  ) {
    return "El correo o la contrasena no son correctos.";
  }

  if (code.includes("email_not_confirmed") || message.includes("email not confirmed")) {
    return "Confirma tu correo antes de entrar.";
  }

  if (
    code.includes("user_already_exists")
    || message.includes("already registered")
    || message.includes("already exists")
  ) {
    return "Ese correo ya tiene una cuenta. Intenta iniciar sesion.";
  }

  if (message.includes("password")) {
    return "La contrasena no cumple los requisitos de seguridad.";
  }

  if (code.includes("rate_limit") || message.includes("too many") || message.includes("rate limit")) {
    return "Demasiados intentos por ahora. Espera unos minutos y vuelve a intentar.";
  }

  return action === "sign-in"
    ? "No se pudo iniciar sesion. Intenta de nuevo."
    : "No se pudo crear la cuenta. Intenta de nuevo.";
}

async function getPostAuthRedirect(
  supabase: SupabaseServerClient,
  next?: string,
) {
  const safeNext = normalizeInternalNext(next);
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    return safeNext;
  }

  const { data, error } = await supabase
    .rpc("get_my_profile")
    .maybeSingle();
  const privateProfile = data as { onboarding_completed_at?: string | null } | null;

  if (!error) {
    return privateProfile?.onboarding_completed_at
      ? safeNext
      : `/onboarding?next=${encodeURIComponent(safeNext)}`;
  }

  const { data: legacyProfile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", userId)
    .maybeSingle();

  if (legacyProfile?.onboarding_completed_at) {
    return safeNext;
  }

  return `/onboarding?next=${encodeURIComponent(safeNext)}`;
}

function optionalFormString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : undefined;
}

function getSelectedTagSlugs(values: FormDataEntryValue[], limit: number) {
  return Array.from(
    new Set(
      values
        .map(String)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ).slice(0, limit);
}

async function insertItemTags(
  supabase: SupabaseServerClient,
  tableName: "item_private_interest_tags" | "item_public_tags",
  itemId: string,
  tagSlugs: string[],
) {
  if (tagSlugs.length === 0) {
    return null;
  }

  const { data: tags, error: tagsError } = await supabase
    .from("tags")
    .select("id")
    .in("slug", tagSlugs);

  if (tagsError) {
    return getPublicDatabaseErrorMessage(
      tagsError,
      "No se pudieron guardar las etiquetas del articulo.",
    );
  }

  const tagRows = (tags ?? []).map((tag) => ({
    item_id: itemId,
    tag_id: tag.id,
  }));

  if (tagRows.length === 0) {
    return null;
  }

  const { error } = await supabase.from(tableName).insert(tagRows);

  return error
    ? getPublicDatabaseErrorMessage(
      error,
      "No se pudieron guardar las etiquetas del articulo.",
    )
    : null;
}

async function removeStoragePhotos(paths: string[]) {
  if (paths.length === 0 || !hasSupabasePublicConfig()) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  await supabase.storage.from("item-photos").remove(paths);
}

async function replaceProfilePrivateInterestTags(
  supabase: SupabaseServerClient,
  userId: string,
  slugs: string[],
) {
  const { data: tags, error: tagsError } = await supabase
    .from("tags")
    .select("id")
    .in("slug", slugs);

  if (tagsError) {
    return getOnboardingErrorMessage(tagsError.message);
  }

  const { error: deleteError } = await supabase
    .from("profile_private_interest_tags")
    .delete()
    .eq("profile_id", userId);

  if (deleteError) {
    return getOnboardingErrorMessage(deleteError.message);
  }

  const tagRows = (tags ?? []).map((tag) => ({
    profile_id: userId,
    tag_id: tag.id,
  }));

  if (tagRows.length === 0) {
    return null;
  }

  const { error: insertError } = await supabase
    .from("profile_private_interest_tags")
    .insert(tagRows);

  return insertError ? getOnboardingErrorMessage(insertError.message) : null;
}

function getCreateItemValidationMessage(error: z.ZodError) {
  const messages = error.issues.map((issue) => {
    const field = issue.path[0];

    if (field === "title") {
      return "El título debe tener entre 3 y 120 caracteres.";
    }

    if (field === "description") {
      return "La descripción real debe tener al menos 20 caracteres.";
    }

    if (field === "knownDefects") {
      return "Escribe al menos 3 caracteres en defectos o detalles.";
    }

    if (field === "city") {
      return "La ciudad debe tener al menos 2 caracteres.";
    }

    if (field === "state") {
      return "El estado debe tener al menos 2 caracteres.";
    }

    if (field === "postalCode") {
      return "El codigo postal debe tener 5 digitos.";
    }

    if (field === "category") {
      return "Elige una categoría disponible.";
    }

    if (field === "condition") {
      return "Elige el estado del artículo.";
    }

    return "Revisa los campos requeridos de la publicación.";
  });

  return Array.from(new Set(messages)).join(" ");
}

function getTradeRequestStatusMessage(status: Extract<TradeRequestStatus, "accepted" | "rejected" | "cancelled" | "completed">) {
  if (status === "accepted") {
    return "Solicitud aceptada. Queda en negociación y se habilita el chat; todavía no cuenta como completada.";
  }

  if (status === "rejected") {
    return "Solicitud rechazada.";
  }

  if (status === "cancelled") {
    return "Solicitud cancelada.";
  }

  return "Confirmación guardada. El trueque solo cuenta cuando ambas personas confirman que sí se hizo.";
}

function getItemStatusMessage(status: Extract<ItemStatus, "active" | "paused">) {
  return status === "active"
    ? "Publicación activa. Ya aparece en Explorar y puede recibir solicitudes."
    : "Publicación pausada. Ya no aparece en Explorar ni recibe nuevas solicitudes.";
}

function getSavedItemsErrorMessage(message: string) {
  const normalizedMessage = message.toLocaleLowerCase("es-MX");

  if (normalizedMessage.includes("saved_items") || normalizedMessage.includes("relation")) {
    return "Falta correr la migración de guardados en Supabase.";
  }

  return "No se pudo actualizar guardados.";
}

function getOnboardingErrorMessage(message: string) {
  const normalizedMessage = message.toLocaleLowerCase("es-MX");

  if (
    normalizedMessage.includes("profile_private_interest_tags")
    || normalizedMessage.includes("onboarding_completed_at")
    || normalizedMessage.includes("relation")
    || normalizedMessage.includes("column")
  ) {
    return "Falta correr la migración 0011 de onboarding en Supabase.";
  }

  return "No se pudo completar el perfil.";
}

function getPhoneVerificationErrorMessage(message: string) {
  const normalizedMessage = message.toLocaleLowerCase("es-MX");

  if (
    normalizedMessage.includes("phone_last4")
    || normalizedMessage.includes("phone_verified_at")
    || normalizedMessage.includes("phone_verification_started_at")
    || normalizedMessage.includes("column")
  ) {
    return "Falta correr la migración 0013 de verificación telefónica en Supabase.";
  }

  if (
    normalizedMessage.includes("sms")
    || normalizedMessage.includes("phone provider")
    || normalizedMessage.includes("unsupported")
    || normalizedMessage.includes("not enabled")
    || normalizedMessage.includes("provider is not")
  ) {
    return "Falta activar el proveedor de SMS en Supabase Auth para enviar códigos.";
  }

  if (
    normalizedMessage.includes("invalid")
    || normalizedMessage.includes("expired")
    || normalizedMessage.includes("otp")
    || normalizedMessage.includes("token")
  ) {
    return "El código no es válido o ya expiró. Intenta pedir uno nuevo.";
  }

  if (normalizedMessage.includes("rate") || normalizedMessage.includes("too many")) {
    return "Demasiados intentos por ahora. Espera unos minutos y vuelve a intentar.";
  }

  return "No se pudo verificar el teléfono.";
}

function normalizePhoneNumber(value: string) {
  const compact = value.trim().replace(/[()\s.-]/g, "");

  if (compact.startsWith("+")) {
    const normalized = `+${compact.slice(1).replace(/\D/g, "")}`;
    return /^\+[1-9]\d{9,14}$/.test(normalized) ? normalized : null;
  }

  const digits = compact.replace(/\D/g, "");

  if (/^\d{10}$/.test(digits)) {
    return `+52${digits}`;
  }

  if (/^52\d{10}$/.test(digits)) {
    return `+${digits}`;
  }

  return /^\d{10,15}$/.test(digits) ? `+${digits}` : null;
}

function safeFileName(value: string) {
  return value
    .toLocaleLowerCase("es-MX")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "foto.jpg";
}
