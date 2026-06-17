"use client";

import { ChevronLeft, ChevronRight, Images } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type ItemPhotoGalleryProps = {
  title: string;
  photoUrls: string[];
};

export function ItemPhotoGallery({ title, photoUrls }: ItemPhotoGalleryProps) {
  const photos = photoUrls.length > 0 ? photoUrls : ["/window.svg"];
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentPhoto = photos[currentIndex] ?? photos[0];
  const hasMultiplePhotos = photos.length > 1;

  const showPrevious = () => {
    setCurrentIndex((index) => (index === 0 ? photos.length - 1 : index - 1));
  };

  const showNext = () => {
    setCurrentIndex((index) => (index === photos.length - 1 ? 0 : index + 1));
  };

  return (
    <section className="overflow-hidden rounded-lg border border-stone-200 bg-white">
      <div className="relative aspect-[16/10] bg-stone-100">
        <Image
          src={currentPhoto}
          alt={`${title} - foto ${currentIndex + 1}`}
          fill
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover"
          priority
          unoptimized
        />

        <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-md bg-white/95 px-3 py-1.5 text-xs font-semibold text-stone-800 shadow-sm">
          <Images aria-hidden="true" size={15} />
          <span>
            Foto {currentIndex + 1} de {photos.length}
          </span>
        </div>

        {hasMultiplePhotos ? (
          <>
            <button
              type="button"
              onClick={showPrevious}
              aria-label="Ver foto anterior"
              className="absolute left-3 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-stone-800 shadow-sm transition hover:bg-white"
            >
              <ChevronLeft aria-hidden="true" size={22} />
            </button>
            <button
              type="button"
              onClick={showNext}
              aria-label="Ver foto siguiente"
              className="absolute right-3 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-stone-800 shadow-sm transition hover:bg-white"
            >
              <ChevronRight aria-hidden="true" size={22} />
            </button>
          </>
        ) : null}
      </div>

      {hasMultiplePhotos ? (
        <div className="grid grid-cols-4 gap-2 border-t border-stone-200 p-3 sm:grid-cols-6 lg:grid-cols-8">
          {photos.map((photoUrl, index) => {
            const isSelected = index === currentIndex;

            return (
              <button
                key={`${photoUrl}-${index}`}
                type="button"
                onClick={() => setCurrentIndex(index)}
                aria-label={`Ver foto ${index + 1}`}
                className={`relative aspect-square overflow-hidden rounded-md border transition ${
                  isSelected
                    ? "border-emerald-700 ring-2 ring-emerald-200"
                    : "border-stone-200 hover:border-stone-400"
                }`}
              >
                <Image
                  src={photoUrl}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-cover"
                  unoptimized
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
