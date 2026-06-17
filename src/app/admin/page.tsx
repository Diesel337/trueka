import { Ban, CheckCircle2, Clock3, EyeOff, ExternalLink, Flag, History, RotateCcw, Tags, UserCheck, XCircle } from "lucide-react";
import Link from "next/link";

import { adminModerationAction } from "@/app/actions";
import { categories, privateInterestTags, prohibitedItemExamples } from "@/lib/constants";
import {
  getAdminBannedProfiles,
  getAdminHiddenItems,
  getAdminItemModerationReviews,
  getAdminModerationActions,
  getAdminReports,
  getCurrentProfile,
  getItemsResult,
} from "@/lib/data";
import type {
  AdminModerationAction,
  Item,
  ItemModerationReview,
  Profile,
  ReportReason,
  ReportStatus,
} from "@/lib/types";

const reportReasonLabels: Record<ReportReason, string> = {
  prohibited_item: "Artículo prohibido",
  false_information: "Información falsa",
  suspicious_user: "Usuario sospechoso",
  possible_scam: "Posible fraude",
  harassment: "Acoso",
  stolen_item: "Posible artículo robado",
  misleading_photos: "Fotos engañosas",
  other: "Otro motivo",
};

const reportStatusLabels: Record<ReportStatus, string> = {
  open: "Abierto",
  reviewing: "En revisión",
  resolved: "Resuelto",
  dismissed: "Descartado",
};

const adminActionLabels: Record<AdminModerationAction["action"], string> = {
  approve_item: "Aprobó publicación",
  reject_item: "Rechazó publicación",
  hide_item: "Ocultó publicación",
  restore_item: "Restauró publicación",
  ban_user: "Baneó usuario",
  unban_user: "Desbaneó usuario",
  review_report: "Marcó reporte en revisión",
  resolve_report: "Resolvió reporte",
  dismiss_report: "Descartó reporte",
  update_report_notes: "Actualizó nota interna",
};

export default async function AdminPage() {
  const currentUser = await getCurrentProfile();

  if (!currentUser) {
    return (
      <main className="mx-auto flex max-w-3xl flex-1 items-center px-4 py-12">
        <div className="rounded-lg border border-stone-200 bg-white p-8">
          <h1 className="text-2xl font-semibold text-stone-950">Inicia sesión</h1>
          <p className="mt-2 text-stone-600">
            Necesitas entrar con una cuenta admin para ver este panel.
          </p>
          <Link
            href={`/auth?next=${encodeURIComponent("/admin")}`}
            className="mt-5 inline-flex rounded-md bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Entrar o crear cuenta
          </Link>
        </div>
      </main>
    );
  }

  if (!currentUser.isAdmin) {
    return (
      <main className="mx-auto flex max-w-3xl flex-1 items-center px-4 py-12">
        <div className="rounded-lg border border-stone-200 bg-white p-8">
          <h1 className="text-2xl font-semibold text-stone-950">Panel no disponible</h1>
          <p className="mt-2 text-stone-600">
            Esta sección solo está disponible para cuentas con rol admin.
          </p>
          <Link
            href="/items"
            className="mt-5 inline-flex rounded-md bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Volver a explorar
          </Link>
        </div>
      </main>
    );
  }

  const [
    { items },
    reports,
    itemModerationReviews,
    hiddenItems,
    bannedProfiles,
    moderationActions,
  ] = await Promise.all([
    getItemsResult(undefined, { includeBlockedOwners: true }),
    getAdminReports(),
    getAdminItemModerationReviews(),
    getAdminHiddenItems(),
    getAdminBannedProfiles(),
    getAdminModerationActions(),
  ]);
  const openReportCount = reports.filter((report) =>
    ["open", "reviewing"].includes(report.status),
  ).length;
  const activeModerationCount = hiddenItems.length + bannedProfiles.length;

  return (
    <main className="flex-1">
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-semibold text-stone-950">Panel admin</h1>
          <p className="mt-2 max-w-2xl text-stone-600">
            Herramientas mínimas para moderar reportes, ocultar publicaciones, banear usuarios y
            mantener categorías/tags.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="space-y-6">
          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock3 aria-hidden="true" size={20} className="text-amber-700" />
                <h2 className="text-xl font-semibold text-stone-950">Publicaciones en revisión</h2>
              </div>
              <span className="rounded-md bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-900">
                {itemModerationReviews.length} pendientes
              </span>
            </div>
            {itemModerationReviews.length > 0 ? (
              <div className="grid gap-3">
                {itemModerationReviews.map((review) => (
                  <ItemModerationReviewCard key={review.id} review={review} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-5 text-sm leading-6 text-stone-600">
                No hay publicaciones esperando revisión de prohibidos.
              </div>
            )}
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Flag aria-hidden="true" size={20} className="text-red-700" />
                <h2 className="text-xl font-semibold text-stone-950">Reportes</h2>
              </div>
              <span className="rounded-md bg-red-50 px-3 py-1 text-sm font-semibold text-red-800">
                {openReportCount} abiertos
              </span>
            </div>

            {reports.length === 0 ? (
              <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-5 text-sm leading-6 text-stone-600">
                Todavía no hay reportes. Cuando alguien reporte una publicación, usuario o solicitud,
                aparecerá aquí para revisión.
              </div>
            ) : (
              <div className="grid gap-3">
                {reports.map((report) => (
                  <article
                    key={report.id}
                    className={`rounded-lg border p-4 ${getReportCardClass(report.status)}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-stone-950">
                          {reportReasonLabels[report.reason] ?? "Reporte"}
                        </p>
                        <p className="mt-1 text-sm text-stone-600">
                          Reportó: {report.reporterName} · {formatReportDate(report.createdAt)}
                        </p>
                      </div>
                      <span className={`rounded-md px-2 py-1 text-xs font-semibold ${getReportStatusClass(report.status)}`}>
                        {reportStatusLabels[report.status]}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-stone-700">
                      {report.reportedItemId ? (
                        <Link
                          href={`/items/${report.reportedItemId}`}
                          className="inline-flex w-fit items-center gap-1 font-semibold text-emerald-800 hover:text-emerald-950"
                        >
                          Publicación: {report.reportedItemTitle ?? "Publicación reportada"}
                          <ExternalLink aria-hidden="true" size={14} />
                        </Link>
                      ) : null}
                      {report.reportedUserId ? (
                        <Link
                          href={`/users/${report.reportedUserId}`}
                          className="inline-flex w-fit items-center gap-1 font-semibold text-emerald-800 hover:text-emerald-950"
                        >
                          Usuario: {report.reportedUserName ?? "Usuario reportado"}
                          <ExternalLink aria-hidden="true" size={14} />
                        </Link>
                      ) : null}
                      {report.tradeRequestId ? (
                        <Link
                          href={`/requests/${report.tradeRequestId}`}
                          className="inline-flex w-fit items-center gap-1 font-semibold text-emerald-800 hover:text-emerald-950"
                        >
                          Solicitud reportada
                          <ExternalLink aria-hidden="true" size={14} />
                        </Link>
                      ) : null}
                      {report.details ? (
                        <p className="rounded-md bg-white/70 p-3 leading-6 text-stone-700">
                          {report.details}
                        </p>
                      ) : null}
                    </div>

                    <form action={adminModerationAction} className="mt-4 grid gap-2 rounded-md border border-stone-200 bg-white/70 p-3">
                      <input type="hidden" name="intent" value="update_report_notes" />
                      <input type="hidden" name="reportId" value={report.id} />
                      <label className="text-xs font-semibold uppercase text-stone-500">
                        Nota interna de moderación
                      </label>
                      <textarea
                        name="adminNotes"
                        rows={3}
                        maxLength={1000}
                        defaultValue={report.adminNotes}
                        placeholder="Ej. Foto no coincide, usuario reincidente, se pidió más contexto..."
                        className="rounded-md border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                      />
                      <button className="w-fit rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">
                        Guardar nota
                      </button>
                    </form>

                    {isActionableReport(report.status) ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {report.status === "open" ? (
                          <form action={adminModerationAction}>
                            <input type="hidden" name="intent" value="review_report" />
                            <input type="hidden" name="reportId" value={report.id} />
                            <button className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">
                              <Clock3 aria-hidden="true" size={16} />
                              Revisando
                            </button>
                          </form>
                        ) : null}
                        {report.reportedItemId ? (
                          <form action={adminModerationAction}>
                            <input type="hidden" name="intent" value="hide_item" />
                            <input type="hidden" name="reportId" value={report.id} />
                            <input type="hidden" name="itemId" value={report.reportedItemId} />
                            <button className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">
                              <EyeOff aria-hidden="true" size={16} />
                              Ocultar publicación
                            </button>
                          </form>
                        ) : null}
                        {report.reportedUserId ? (
                          <form action={adminModerationAction}>
                            <input type="hidden" name="intent" value="ban_user" />
                            <input type="hidden" name="reportId" value={report.id} />
                            <input type="hidden" name="userId" value={report.reportedUserId} />
                            <button className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
                              <Ban aria-hidden="true" size={16} />
                              Banear usuario
                            </button>
                          </form>
                        ) : null}
                        <form action={adminModerationAction}>
                          <input type="hidden" name="intent" value="resolve_report" />
                          <input type="hidden" name="reportId" value={report.id} />
                          <button className="inline-flex items-center gap-2 rounded-md border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">
                            <CheckCircle2 aria-hidden="true" size={16} />
                            Resolver
                          </button>
                        </form>
                        <form action={adminModerationAction}>
                          <input type="hidden" name="intent" value="dismiss_report" />
                          <input type="hidden" name="reportId" value={report.id} />
                          <button className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">
                            <XCircle aria-hidden="true" size={16} />
                            Descartar
                          </button>
                        </form>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <RotateCcw aria-hidden="true" size={20} className="text-emerald-800" />
                <h2 className="text-xl font-semibold text-stone-950">Moderación activa</h2>
              </div>
              <span className="rounded-md bg-stone-100 px-3 py-1 text-sm font-semibold text-stone-700">
                {activeModerationCount} casos
              </span>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <HiddenItemsPanel items={hiddenItems} />
              <BannedProfilesPanel profiles={bannedProfiles} />
            </div>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-stone-950">Publicaciones activas</h2>
            <div className="mt-4 overflow-hidden rounded-lg border border-stone-200">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-stone-50 text-stone-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Artículo</th>
                    <th className="px-4 py-3 font-semibold">Ciudad</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 font-semibold">Moderación</th>
                    <th className="px-4 py-3 font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium text-stone-900">{item.title}</td>
                      <td className="px-4 py-3 text-stone-600">{item.city}</td>
                      <td className="px-4 py-3 text-stone-600">{item.state}</td>
                      <td className="px-4 py-3 text-stone-600">{item.moderationStatus}</td>
                      <td className="px-4 py-3">
                        <form action={adminModerationAction}>
                          <input type="hidden" name="intent" value="hide_item" />
                          <input type="hidden" name="itemId" value={item.id} />
                          <button className="rounded-md border border-stone-300 px-3 py-2 font-semibold text-stone-700 hover:bg-stone-50">
                            Ocultar
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <History aria-hidden="true" size={18} className="text-emerald-800" />
              <h2 className="text-lg font-semibold text-stone-950">Historial reciente</h2>
            </div>
            {moderationActions.length > 0 ? (
              <div className="space-y-3">
                {moderationActions.map((action) => (
                  <ModerationActionEntry key={action.id} action={action} />
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
                Aún no hay acciones registradas.
              </div>
            )}
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Tags aria-hidden="true" size={18} className="text-emerald-800" />
              <h2 className="text-lg font-semibold text-stone-950">Categorías</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <span key={category.slug} className="rounded-md border border-stone-200 px-2 py-1 text-xs text-stone-700">
                  {category.name}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-950">Tags básicos</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {privateInterestTags.map((tag) => (
                <span key={tag.slug} className="rounded-md bg-stone-100 px-2 py-1 text-xs text-stone-700">
                  {tag.name}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-red-200 bg-red-50 p-5">
            <h2 className="text-lg font-semibold text-red-950">Artículos prohibidos</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-red-950">
              {prohibitedItemExamples.slice(0, 8).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </aside>
      </section>
    </main>
  );
}

function ItemModerationReviewCard({ review }: { review: ItemModerationReview }) {
  return (
    <article className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/items/${review.item.id}`}
              className="line-clamp-1 text-sm font-semibold text-emerald-900 hover:text-emerald-950"
            >
              {review.item.title}
            </Link>
            <span className="rounded-md bg-white/80 px-2 py-1 text-xs font-semibold text-amber-900">
              {review.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-stone-700">
            Dueño: {review.owner.displayName} · {review.item.city}, {review.item.state}
          </p>
          <p className="mt-3 rounded-md bg-white/75 p-3 text-sm leading-6 text-stone-700">
            {review.reason}
          </p>
          <p className="mt-2 text-xs leading-5 text-stone-500">
            Abierta: {formatReportDate(review.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <form action={adminModerationAction}>
            <input type="hidden" name="intent" value="approve_item" />
            <input type="hidden" name="itemId" value={review.item.id} />
            <button className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">
              <CheckCircle2 aria-hidden="true" size={16} />
              Aprobar
            </button>
          </form>
          <form action={adminModerationAction}>
            <input type="hidden" name="intent" value="reject_item" />
            <input type="hidden" name="itemId" value={review.item.id} />
            <button className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
              <XCircle aria-hidden="true" size={16} />
              Rechazar
            </button>
          </form>
        </div>
      </div>
    </article>
  );
}

function HiddenItemsPanel({ items }: { items: Item[] }) {
  return (
    <div className="min-w-0">
      <h3 className="text-sm font-semibold text-stone-950">Publicaciones ocultas</h3>
      <p className="mt-1 text-sm leading-6 text-stone-600">
        Fuera de Explorar hasta que admin las restaure.
      </p>
      {items.length > 0 ? (
        <div className="mt-3 divide-y divide-stone-200 border-t border-stone-200">
          {items.map((item) => (
            <div key={item.id} className="grid gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <Link
                  href={`/items/${item.id}`}
                  className="line-clamp-1 text-sm font-semibold text-emerald-800 hover:text-emerald-950"
                >
                  {item.title}
                </Link>
                <p className="mt-1 text-xs text-stone-500">
                  {item.city}, {item.state} · {item.status} / {item.moderationStatus}
                </p>
              </div>
              <form action={adminModerationAction}>
                <input type="hidden" name="intent" value="restore_item" />
                <input type="hidden" name="itemId" value={item.id} />
                <button className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 sm:w-auto">
                  <RotateCcw aria-hidden="true" size={16} />
                  Restaurar
                </button>
              </form>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-md border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
          No hay publicaciones ocultas por admin.
        </div>
      )}
    </div>
  );
}

function BannedProfilesPanel({ profiles }: { profiles: Profile[] }) {
  return (
    <div className="min-w-0">
      <h3 className="text-sm font-semibold text-stone-950">Usuarios baneados</h3>
      <p className="mt-1 text-sm leading-6 text-stone-600">
        Sin acceso a publicar ni crear nuevas solicitudes.
      </p>
      {profiles.length > 0 ? (
        <div className="mt-3 divide-y divide-stone-200 border-t border-stone-200">
          {profiles.map((profile) => (
            <div key={profile.id} className="grid gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <Link
                  href={`/users/${profile.id}`}
                  className="line-clamp-1 text-sm font-semibold text-emerald-800 hover:text-emerald-950"
                >
                  {profile.displayName}
                </Link>
                <p className="mt-1 text-xs text-stone-500">
                  {profile.city}, {profile.state}
                </p>
              </div>
              <form action={adminModerationAction}>
                <input type="hidden" name="intent" value="unban_user" />
                <input type="hidden" name="userId" value={profile.id} />
                <button className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 sm:w-auto">
                  <UserCheck aria-hidden="true" size={16} />
                  Desbanear
                </button>
              </form>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-md border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
          No hay usuarios baneados.
        </div>
      )}
    </div>
  );
}

function ModerationActionEntry({ action }: { action: AdminModerationAction }) {
  const stateChange = getModerationActionStateChange(action);

  return (
    <article className="border-t border-stone-200 pt-3 first:border-t-0 first:pt-0">
      <p className="text-sm font-semibold text-stone-950">
        {adminActionLabels[action.action] ?? "Acción admin"}
      </p>
      <p className="mt-1 text-xs leading-5 text-stone-500">
        {action.adminName} · {formatReportDate(action.createdAt)}
      </p>
      <p className="mt-2 text-sm leading-5 text-stone-700">
        {getModerationActionTarget(action)}
      </p>
      {stateChange ? (
        <p className="mt-1 text-xs leading-5 text-stone-500">{stateChange}</p>
      ) : null}
      {action.note ? (
        <p className="mt-2 rounded-md bg-stone-50 p-2 text-xs leading-5 text-stone-600">
          {action.note}
        </p>
      ) : null}
    </article>
  );
}

function isActionableReport(status: ReportStatus) {
  return status === "open" || status === "reviewing";
}

function getReportCardClass(status: ReportStatus) {
  if (status === "open") {
    return "border-red-200 bg-red-50";
  }

  if (status === "reviewing") {
    return "border-amber-200 bg-amber-50";
  }

  return "border-stone-200 bg-stone-50";
}

function getReportStatusClass(status: ReportStatus) {
  if (status === "open") {
    return "bg-red-100 text-red-800";
  }

  if (status === "reviewing") {
    return "bg-amber-100 text-amber-900";
  }

  if (status === "resolved") {
    return "bg-emerald-100 text-emerald-800";
  }

  return "bg-stone-200 text-stone-700";
}

function getModerationActionTarget(action: AdminModerationAction) {
  if (action.targetItemId) {
    return `Publicación: ${action.targetItemTitle ?? action.targetItemId}`;
  }

  if (action.targetUserId) {
    return `Usuario: ${action.targetUserName ?? action.targetUserId}`;
  }

  if (action.reportId) {
    return `Reporte: ${action.reportId.slice(0, 8)}`;
  }

  return "Sin objetivo visible.";
}

function getModerationActionStateChange(action: AdminModerationAction) {
  if (action.previousItemStatus || action.nextItemStatus) {
    return [
      action.previousItemStatus ?? "sin estado",
      action.previousItemModerationStatus ?? "sin moderación",
      "→",
      action.nextItemStatus ?? "sin estado",
      action.nextItemModerationStatus ?? "sin moderación",
    ].join(" ");
  }

  if (typeof action.previousUserBanned === "boolean" || typeof action.nextUserBanned === "boolean") {
    const previous = action.previousUserBanned ? "baneado" : "activo";
    const next = action.nextUserBanned ? "baneado" : "activo";

    return `${previous} → ${next}`;
  }

  return null;
}

function formatReportDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
