"use client";

import { Camera, ImagePlus, Info, LockKeyhole, Tags } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";

import { updateItemAction } from "@/app/actions";
import { initialActionState } from "@/lib/action-state";
import { conditionLabels, valueRangeLabels } from "@/lib/constants";
import type { Category, Item, Tag } from "@/lib/types";

import { LocationSelectFields } from "./location-select-fields";

const maxPhotoSlots = 8;
const maxPhotoSizeBytes = 5 * 1024 * 1024;

type EditItemFormProps = {
  item: Item;
  categories: Category[];
  publicTags: Tag[];
  publicTagSlugs: string[];
  privateInterestTags: Tag[];
  privateInterestTagSlugs: string[];
};

export function EditItemForm({
  item,
  categories,
  publicTags,
  publicTagSlugs,
  privateInterestTags,
  privateInterestTagSlugs,
}: EditItemFormProps) {
  const [state, action, pending] = useActionState(updateItemAction, initialActionState);
  const [selectedPhotoNames, setSelectedPhotoNames] = useState<(string | null)[]>(
    Array.from({ length: maxPhotoSlots }, () => null),
  );
  const [photoError, setPhotoError] = useState<string | null>(null);
  const selectedPhotoCount = selectedPhotoNames.filter(Boolean).length;
  const selectedPublicTags = useMemo(
    () => new Set(publicTagSlugs),
    [publicTagSlugs],
  );
  const selectedPrivateTags = useMemo(
    () => new Set(privateInterestTagSlugs),
    [privateInterestTagSlugs],
  );
  const canSubmit = !photoError && !pending;

  useEffect(() => {
    if (state.ok && state.href) {
      window.location.href = state.href;
    }
  }, [state.href, state.ok]);

  return (
    <form action={action} className="grid gap-6 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <input type="hidden" name="itemId" value={item.id} />

      <section className="grid gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-stone-800">
          <Camera aria-hidden="true" size={18} />
          Fotos reales
        </div>

        <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
          <p className="text-sm font-semibold text-stone-800">Fotos actuales</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {item.photoUrls.slice(0, 8).map((photoUrl, index) => (
              <div key={`${photoUrl}-${index}`} className="relative aspect-[4/3] overflow-hidden rounded-md bg-white">
                <Image
                  src={photoUrl}
                  alt={`${item.title} foto ${index + 1}`}
                  fill
                  sizes="(min-width: 1024px) 20vw, 50vw"
                  className="object-cover"
                  unoptimized
                />
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm leading-6 text-stone-500">
            Si eliges fotos nuevas, reemplazan todas las actuales. Si no eliges ninguna, se conservan.
          </p>
        </div>

        <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {selectedPhotoNames.map((photoName, index) => (
              <label
                key={index}
                className={`grid min-h-28 cursor-pointer place-items-center rounded-md border p-3 text-center transition ${
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
                  {photoName ? `Nueva foto ${index + 1}` : `Elegir foto ${index + 1}`}
                </span>
                <span className="mt-1 max-w-full break-all text-xs text-stone-500">
                  {photoName ?? "Opcional"}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-sm leading-6 text-stone-500">
            {selectedPhotoCount > 0
              ? `${selectedPhotoCount} foto${selectedPhotoCount === 1 ? "" : "s"} nueva${selectedPhotoCount === 1 ? "" : "s"} seleccionada${selectedPhotoCount === 1 ? "" : "s"}.`
              : "No seleccionaste fotos nuevas; se conservarán las actuales."}
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
            defaultValue={item.title}
            className="min-h-11 rounded-md border border-stone-200 px-3 outline-none focus:border-emerald-600"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-stone-800">Categoría</span>
          <select
            name="category"
            required
            defaultValue={item.category.slug}
            className="min-h-11 rounded-md border border-stone-200 px-3 outline-none focus:border-emerald-600"
          >
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
            defaultValue={item.condition}
            className="min-h-11 rounded-md border border-stone-200 px-3 outline-none focus:border-emerald-600"
          >
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
            defaultValue={item.approximateValueRange ?? ""}
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
            defaultValue={item.description}
            className="rounded-md border border-stone-200 px-3 py-3 outline-none focus:border-emerald-600"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-stone-800">Defectos o detalles conocidos</span>
          <textarea
            name="knownDefects"
            required
            minLength={3}
            rows={4}
            defaultValue={item.knownDefects}
            className="rounded-md border border-stone-200 px-3 py-3 outline-none focus:border-emerald-600"
          />
        </label>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <LocationSelectFields
          defaultState={item.state}
          defaultMunicipality={item.city}
          className="contents"
        />
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-stone-800">Codigo postal</span>
          <input
            name="postalCode"
            defaultValue={item.postalCode ?? ""}
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength={5}
            placeholder="Ej. 44100"
            className="min-h-11 rounded-md border border-stone-200 px-3 outline-none focus:border-emerald-600"
          />
          <span className="text-xs leading-5 text-stone-500">
            Solo ayuda a ordenar cerca; no es direccion.
          </span>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-stone-800">Zona aproximada</span>
          <input
            name="approximateZone"
            defaultValue={item.approximateZone ?? ""}
            placeholder="Opcional"
            className="min-h-11 rounded-md border border-stone-200 px-3 outline-none focus:border-emerald-600"
          />
        </label>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <label className="flex items-start gap-3 rounded-md border border-stone-200 p-4">
          <input
            name="acceptsOtherCities"
            type="checkbox"
            defaultChecked={item.acceptsOtherCities}
            className="mt-1 size-4 accent-emerald-700"
          />
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
            defaultChecked={item.acceptsMultipleItems}
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
            defaultValue={item.publicPreferences ?? ""}
            className="rounded-md border border-stone-200 px-3 py-3 outline-none focus:border-emerald-600"
          />
        </label>

        <div className="rounded-lg border border-stone-200 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-800">
            <Tags aria-hidden="true" size={16} />
            Etiquetas visibles
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {publicTags.map((tag) => (
              <label key={tag.slug} className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  name="publicTags"
                  value={tag.slug}
                  type="checkbox"
                  defaultChecked={selectedPublicTags.has(tag.slug)}
                  className="size-4 accent-emerald-700"
                />
                {tag.name}
              </label>
            ))}
          </div>
          <p className="mt-3 flex gap-2 text-sm leading-6 text-stone-500">
            <Info aria-hidden="true" size={16} className="mt-1 shrink-0" />
            Se muestran en la publicación y ayudan a que otras personas encuentren tu artículo.
            Usa hasta 6.
          </p>
        </div>

        <div className="rounded-lg border border-stone-200 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-800">
            <LockKeyhole aria-hidden="true" size={16} />
            Etiquetas privadas para matching
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {privateInterestTags.map((tag) => (
              <label key={tag.slug} className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  name="privateInterestTags"
                  value={tag.slug}
                  type="checkbox"
                  defaultChecked={selectedPrivateTags.has(tag.slug)}
                  className="size-4 accent-emerald-700"
                />
                {tag.name}
              </label>
            ))}
          </div>
          <p className="mt-3 flex gap-2 text-sm leading-6 text-stone-500">
            <Info aria-hidden="true" size={16} className="mt-1 shrink-0" />
            Estas etiquetas ayudan al matching, pero no se muestran completas públicamente.
          </p>
        </div>
      </section>

      {state.message ? (
        <p className={`rounded-md p-3 text-sm ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-stone-200 pt-5 sm:flex-row sm:justify-end">
        <Link
          href={`/items/${item.id}`}
          className="inline-flex items-center justify-center rounded-md border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-md bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600"
        >
          {pending ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
