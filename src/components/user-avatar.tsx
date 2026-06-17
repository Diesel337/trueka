import { UserRound } from "lucide-react";
import Image from "next/image";

export function UserAvatar({
  src,
  alt,
  size = 48,
}: {
  src?: string;
  alt: string;
  size?: number;
}) {
  const className = "overflow-hidden rounded-md bg-emerald-100 text-emerald-800";

  if (src) {
    return (
      <div className={className} style={{ width: size, height: size }}>
        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          className="size-full object-cover"
          unoptimized
        />
      </div>
    );
  }

  return (
    <div className={`grid place-items-center ${className}`} style={{ width: size, height: size }}>
      <UserRound aria-hidden="true" size={Math.max(18, Math.round(size * 0.46))} />
    </div>
  );
}
