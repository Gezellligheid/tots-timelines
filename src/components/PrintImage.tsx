"use client";
import { useEffect, useState } from "react";
import { photoUrl } from "@/lib/media";

/** A plain <img> for printed pages: private R2 photo (signed URL) or an inline data URL. No animation, so it prints reliably. */
export function PrintImage({ photoKey, src, className = "", fallback }: { photoKey?: string; src?: string; className?: string; fallback?: React.ReactNode }) {
  const [url, setUrl] = useState<string | null>(src ?? null);
  useEffect(() => {
    if (src) return setUrl(src);
    if (!photoKey) return;
    let live = true;
    photoUrl(photoKey).then((u) => live && setUrl(u)).catch(() => {});
    return () => {
      live = false;
    };
  }, [photoKey, src]);
  return (
    <div className={`overflow-hidden bg-[var(--surface-2)] ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : !photoKey && !src ? fallback : null}
    </div>
  );
}
