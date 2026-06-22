"use client";

import { Camera, ImagePlus, Info, LockKeyhole, Tags } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { createItemAction } from "@/app/actions";
import { initialActionState } from "@/lib/action-state";
import { conditionLabels, valueRangeLabels } from "@/lib/constants";
import type { Category, Tag } from "@/lib/types";

import { LocationSelectFields } from "./location-select-fields";

const maxPhotoSlots = 8;
const maxPhotoSizeBytes = 5 * 1024 * 1024;

export function NewItemForm({
  categories,
  publicTags,
  privateInterestTags,
  defaultPostalCode,
  next,
}: {
  categories: Category[];
  publicTags: Tag[];
  privateInterestTags: Tag[];
  defaultPostalCode?: string;
  next?: string;
}) {
  const [state, action, pending] = useActionState(createItemAction, initialActionState);
  const [selectedPhotoNames, setSelectedPhotoNames] = useState<(string | null)[]>(
    Array.from({ length: maxPhotoSlots }, () => null),
  );
  const [photoError, setPhotoError] = useState<string | null>(null);
  const selectedPhotoCount = selectedPhotoNames.filter(Boolean).length;
  const canPublish = selectedPhotoCount > 0 && !photoError && !pending;
  const canSaveDraft = !photoError && !pending;

  useEffect(() => {
    if (state.ok && state.href) {
      window.location.href = state.href;
    }
  }, [state.href, state.ok]);

  return (
    <form action={action} className="grid gap-6 rounded-lg border border-stone-200 bg-white px-5 pb-28 pt-5 shadow-sm sm:p-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <section className="grid gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-stone-800">
          <Camera aria-hidden="true" size={18} />
          Fotos reales
        </div>
        <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {selectedPhotoNames.map((photoName, index) => (
              <label
                key={index}
                className={`grid min-h-24 cursor-pointer place-items-center rounded-md border p-3 text-center transition ${
                  photoName
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-stone-200 bg-white hover:border-emerald-300"
                }`}
              >
                <input
                  name="photos"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;

                    if (file && file.size > maxPhotoSizeBytes) {
                      event.target.value = "";
                      setPhotoError(`"${file.name}" pesa más de 5 MB. Elige una foto más ligera.`);
                      setSelectedPhotoNames((currentNames) =>
                        currentNames.map((currentName, currentIndex) =>
                          currentIndex === index ? null : currentName,
                        ),
                      );
                      return;
                    }

                    setPhotoError(null);
                    setSelectedPhotoNames((currentNames) =>
                      currentNames.map((currentName, currentIndex) =>
                        currentIndex === index ? file?.name ?? null : currentName,
                      ),
                    );
                  }}
                />
                <span className="grid size-10 place-items-center rounded-md bg-white text-emerald-800 shadow-sm">
                  <ImagePlus aria-hidden="true" size={20} />
                </span>
                <span className="mt-2 text-sm font-semibold text-stone-800">
                  {photoName ? `Foto ${index + 1}` : `Agregar foto ${index + 1}`}
                </span>
                <span className="mt-1 max-w-full break-all text-xs text-stone-500">
                  {photoName ?? "Toca para seleccionar"}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-sm leading-6 text-stone-500">
            {selectedPhotoCount > 0
              ? `${selectedPhotoCount} foto${selectedPhotoCount === 1 ? "" : "s"} seleccionada${selectedPhotoCount === 1 ? "" : "s"}.`
              : "Necesitas al menos una foto real para publicar."}
          </p>
          {photoError ? <p className="mt-2 text-sm font-medium text-amber-800">{photoError}</p> : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-stone-800">Título</span>
          <input
            name="title"
            required
            placeholder="Ej. Laptop HP 15 con cargador"
            className="min-h-11 rounded-md border border-stone-200 px-3 outline-none focus:border-emerald-600"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-stone-800">Categoría</span>
          <select
            name="category"
            required
            defaultValue=""
            className="min-h-11 rounded-md border border-stone-200 px-3 outline-none focus:border-emerald-600"
          >
            <option value="" disabled>
              Elige una categoría
            </option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-stone-800">Estado</span>
          <select
            name="condition"
            required
            defaultValue=""
            className="min-h-11 rounded-md border border-stone-200 px-3 outline-none focus:border-emerald-600"
          >
            <option value="" disabled>
              Elige el estado del artículo
            </option>
            {Object.entries(conditionLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-stone-800">Rango aproximado opcional</span>
          <select
            name="approximateValueRange"
            className="min-h-11 rounded-md border border-stone-200 px-3 outline-none focus:border-emerald-600"
            defaultValue=""
          >
            <option value="">Prefiero no poner rango</option>
            {Object.entries(valueRangeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <span className="text-xs leading-5 text-stone-500">
            Solo orienta al usuario; no crea campos de pago.
          </span>
        </label>
      </section>

      <section className="grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-stone-800">Descripción real</span>
          <textarea
            name="description"
            required
            minLength={20}
            rows={5}
            placeholder="Cuenta qué incluye, cómo funciona y para qué tipo de trueque estás abierto."
            className="rounded-md border border-stone-200 px-3 py-3 outline-none focus:border-emerald-600"
          />
          <span className="text-xs leading-5 text-stone-500">
            Mínimo 20 caracteres para evitar publicaciones ambiguas.
          </span>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-stone-800">Defectos o detalles conocidos</span>
          <textarea
            name="knownDefects"
            required
            minLength={3}
            rows={4}
            placeholder="Ej. La batería dura poco, tiene rayones, le falta una pieza..."
            className="rounded-md border border-stone-200 px-3 py-3 outline-none focus:border-emerald-600"
          />
        </label>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <LocationSelectFields className="contents" />
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-stone-800">
            Código postal <span className="font-normal text-stone-500">(solo cercanía)</span>
          </span>
          <input
            name="postalCode"
            defaultValue={defaultPostalCode ?? ""}
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength={5}
            placeholder="Ej. 44100"
            className="min-h-11 rounded-md border border-stone-200 px-3 outline-none focus:border-emerald-600"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-stone-800">Zona aproximada</span>
          <input
            name="approximateZone"
            placeholder="Opcional"
            className="min-h-11 rounded-md border border-stone-200 px-3 outline-none focus:border-emerald-600"
          />
        </label>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <label className="flex items-start gap-3 rounded-md border border-stone-200 p-4">
          <input name="acceptsOtherCities" type="checkbox" className="mt-1 size-4 accent-emerald-700" />
          <span>
            <span className="block text-sm font-semibold text-stone-800">
              Acepto propuestas de otra ciudad
            </span>
            <span className="mt-1 block text-sm leading-6 text-stone-500">
              La app mostrará advertencia porque Trueka no gestiona envíos ni entregas.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-md border border-stone-200 p-4">
          <input
            name="acceptsMultipleItems"
            type="checkbox"
            defaultChecked
            className="mt-1 size-4 accent-emerald-700"
          />
          <span>
            <span className="block text-sm font-semibold text-stone-800">
              Acepto varios artículos a cambio
            </span>
            <span className="mt-1 block text-sm leading-6 text-stone-500">
              Permite ofertas como “tu laptop por mi bici + audífonos”.
            </span>
          </span>
        </label>
      </section>

      <section className="grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-stone-800">Preferencias públicas</span>
          <textarea
            name="publicPreferences"
            rows={3}
            placeholder="Ej. Prefiero electrónicos o herramientas, pero escucho propuestas."
            className="rounded-md border border-stone-200 px-3 py-3 outline-none focus:border-emerald-600"
          />
        </label>

        <div className="rounded-lg border border-stone-200 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-800">
            <Tags aria-hidden="true" size={16} />
            Etiquetas de mi artículo
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {publicTags.map((tag) => (
              <label key={tag.slug} className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  name="publicTags"
                  value={tag.slug}
                  type="checkbox"
                  className="size-4 accent-emerald-700"
                />
                {tag.name}
              </label>
            ))}
          </div>
          <p className="mt-3 flex gap-2 text-sm leading-6 text-stone-500">
            <Info aria-hidden="true" size={16} className="mt-1 shrink-0" />
            Se muestran en tu publicación para que otras personas entiendan qué ofreces y te
            encuentren mejor. Usa hasta 6.
          </p>
        </div>

        <div className="rounded-lg border border-stone-200 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-800">
            <LockKeyhole aria-hidden="true" size={16} />
            Etiquetas ocultas para matching
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {privateInterestTags.map((tag) => (
              <label key={tag.slug} className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  name="privateInterestTags"
                  value={tag.slug}
                  type="checkbox"
                  className="size-4 accent-emerald-700"
                />
                {tag.name}
              </label>
            ))}
          </div>
          <p className="mt-3 flex gap-2 text-sm leading-6 text-stone-500">
            <Info aria-hidden="true" size={16} className="mt-1 shrink-0" />
            No se muestran en tu publicación. Ayudan a Trueka a detectar qué buscas y sugerir
            mejores coincidencias.
          </p>
        </div>
      </section>

      {state.message ? (
        <p className={`rounded-md p-3 text-sm ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
          {state.message}
        </p>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-3 border-t border-stone-200 bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_rgba(28,25,23,0.10)] backdrop-blur sm:hidden">
        <button
          type="submit"
          name="intent"
          value="draft"
          disabled={!canSaveDraft}
          className="min-h-12 rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
        >
          {pending ? "Guardando..." : "Borrador"}
        </button>
        <button
          type="submit"
          name="intent"
          value="publish"
          disabled={!canPublish}
          className="min-h-12 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600"
        >
          {pending ? "Publicando..." : "Publicar"}
        </button>
      </div>

      <div className="hidden flex-col gap-3 border-t border-stone-200 pt-5 sm:flex sm:flex-row sm:justify-end">
        <button
          type="submit"
          name="intent"
          value="draft"
          disabled={!canSaveDraft}
          className="rounded-md border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
        >
          {pending ? "Guardando..." : "Guardar borrador"}
        </button>
        <button
          type="submit"
          name="intent"
          value="publish"
          disabled={!canPublish}
          className="rounded-md bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600"
        >
          {pending ? "Publicando..." : "Publicar artículo"}
        </button>
      </div>
    </form>
  );
}
