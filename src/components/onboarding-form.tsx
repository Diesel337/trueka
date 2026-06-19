"use client";

import { Camera, CheckCircle2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { completeOnboardingAction } from "@/app/actions";
import { initialActionState } from "@/lib/action-state";
import type { Profile, Tag } from "@/lib/types";

import { LocationSelectFields } from "./location-select-fields";
import { UserAvatar } from "./user-avatar";

export function OnboardingForm({
  profile,
  tags,
  selectedTagSlugs,
  next,
}: {
  profile: Profile;
  tags: Tag[];
  selectedTagSlugs: string[];
  next: string;
}) {
  const [state, action, pending] = useActionState(completeOnboardingAction, initialActionState);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | undefined>(profile.avatarUrl);
  const [avatarFileName, setAvatarFileName] = useState("");
  const selectedTags = new Set(selectedTagSlugs);

  useEffect(() => {
    if (state.ok && state.href) {
      window.location.href = state.href;
    }
  }, [state.href, state.ok]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  return (
    <form action={action} className="grid gap-5 pb-20 sm:pb-0">
      <input type="hidden" name="next" value={next} />

      <label className="grid gap-3 rounded-lg border border-stone-200 bg-stone-50 p-4 sm:grid-cols-[88px_1fr]">
        <UserAvatar src={avatarPreviewUrl} alt={profile.displayName} size={88} />
        <span className="grid content-center gap-2">
          <span className="text-sm font-semibold text-stone-800">Foto de perfil</span>
          <span className="text-sm leading-6 text-stone-600">
            Ayuda a que la otra persona reconozca con quién está negociando.
          </span>
          <span className="inline-flex w-fit items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700">
            <Camera aria-hidden="true" size={16} />
            {avatarFileName || "Elegir foto"}
          </span>
          <input
            name="avatar"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (!file) {
                setAvatarFileName("");
                setAvatarPreviewUrl(profile.avatarUrl);
                return;
              }

              if (avatarPreviewUrl?.startsWith("blob:")) {
                URL.revokeObjectURL(avatarPreviewUrl);
              }

              setAvatarFileName(file.name);
              setAvatarPreviewUrl(URL.createObjectURL(file));
            }}
          />
        </span>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-stone-800">Nombre visible</span>
          <input
            name="displayName"
            defaultValue={profile.displayName}
            className="min-h-11 rounded-md border border-stone-200 px-3 outline-none focus:border-emerald-600"
          />
        </label>
        <LocationSelectFields
          defaultState={profile.state}
          defaultMunicipality={profile.city}
          className="contents"
        />
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-stone-800">Codigo postal</span>
          <input
            name="postalCode"
            defaultValue={profile.postalCode ?? ""}
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength={5}
            placeholder="Ej. 44100"
            className="min-h-11 rounded-md border border-stone-200 px-3 outline-none focus:border-emerald-600"
          />
          <span className="text-xs leading-5 text-stone-500">
            Se usa para ordenar publicaciones cerca de ti; no es direccion.
          </span>
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-stone-800">Bio corta</span>
        <textarea
          name="bio"
          defaultValue={profile.bio}
          rows={3}
          placeholder="Ej. Me interesan herramientas, audio y cosas útiles para casa."
          className="rounded-md border border-stone-200 px-3 py-3 outline-none focus:border-emerald-600"
        />
      </label>

      <fieldset className="rounded-lg border border-stone-200 p-4">
        <legend className="px-1 text-sm font-semibold text-stone-800">
          Qué te interesa recibir
        </legend>
        <p className="mt-1 text-sm leading-6 text-stone-600">
          Esto queda privado y ayuda a ordenar matches.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-3">
          {tags.map((tag) => (
            <label
              key={tag.slug}
              className="flex min-h-10 items-center gap-2 rounded-md border border-stone-200 px-2 text-sm text-stone-700 hover:bg-stone-50 sm:px-3"
            >
              <input
                name="privateInterestTags"
                type="checkbox"
                value={tag.slug}
                defaultChecked={selectedTags.has(tag.slug)}
                className="size-4 accent-emerald-700"
              />
              {tag.name}
            </label>
          ))}
        </div>
      </fieldset>

      {state.message ? (
        <p className={`rounded-md p-3 text-sm ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
          {state.message}
        </p>
      ) : null}

      <button
        disabled={pending}
        className="fixed inset-x-4 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(28,25,23,0.18)] hover:bg-emerald-800 disabled:bg-stone-300 disabled:text-stone-600 sm:static sm:shadow-none"
      >
        <CheckCircle2 aria-hidden="true" size={18} />
        {pending ? "Guardando..." : "Entrar a Trueka"}
      </button>
    </form>
  );
}
