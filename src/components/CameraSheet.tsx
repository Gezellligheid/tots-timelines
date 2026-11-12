"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Sheet } from "./ui";
import { Icon } from "./Icon";

function Camera({ onCapture, onClose }: { onCapture: (f: File) => void; onClose: () => void }) {
  const t = useTranslations("camera");
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [err, setErr] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    setReady(false);
    setErr(false);
    stream.current?.getTracks().forEach((tr) => tr.stop());
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false })
      .then((s) => {
        if (!live) return s.getTracks().forEach((tr) => tr.stop());
        stream.current = s;
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play().then(() => live && setReady(true)).catch(() => {});
        }
      })
      .catch(() => live && setErr(true));
    return () => {
      live = false;
      stream.current?.getTracks().forEach((tr) => tr.stop());
      stream.current = null;
    };
  }, [facing]);

  const snap = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const side = Math.min(v.videoWidth, v.videoHeight);
    const c = document.createElement("canvas");
    c.width = c.height = Math.min(side, 1200);
    c.getContext("2d")!.drawImage(v, (v.videoWidth - side) / 2, (v.videoHeight - side) / 2, side, side, 0, 0, c.width, c.height);
    c.toBlob(
      (b) => {
        if (!b) return;
        onCapture(new File([b], `photo-${Date.now()}.jpg`, { type: "image/jpeg" }));
        onClose();
      },
      "image/jpeg",
      0.9,
    );
  };

  return (
    <div className="space-y-5">
      <div className="relative mx-auto aspect-square w-full max-w-[340px] overflow-hidden rounded-full bg-surface shadow-[var(--shadow)]">
        <video ref={video} playsInline muted autoPlay className="h-full w-full object-cover" style={{ transform: facing === "user" ? "scaleX(-1)" : undefined }} />
        {!ready && !err && <div className="shimmer absolute inset-0" />}
        {err && <p className="absolute inset-0 grid place-items-center p-8 text-center text-sm font-semibold text-soft">{t("error")}</p>}
      </div>
      <div className="flex items-center justify-center gap-6">
        <button className="glass-btn !h-14 !w-14" aria-label={t("flip")} onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}>
          <Icon name="swap" size={22} />
        </button>
        <button onClick={snap} disabled={!ready} aria-label={t("capture")} className="grid h-20 w-20 place-items-center rounded-full bg-accent p-1.5 transition-transform active:scale-90 disabled:opacity-40">
          <span className="block h-full w-full rounded-full border-4 border-bg bg-ink" />
        </button>
        <button className="glass-btn !h-14 !w-14" aria-label="Close" onClick={onClose}>
          <Icon name="close" size={22} />
        </button>
      </div>
    </div>
  );
}

/** "Take photo" button: live camera in a sheet; falls back to the native camera picker where getUserMedia isn't available. */
export function TakePhotoButton({ onCapture, className = "ghost-btn" }: { onCapture: (f: File) => void; className?: string }) {
  const t = useTranslations("camera");
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const fallback = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={(e) => {
          if (!navigator.mediaDevices?.getUserMedia) return fallback.current?.click();
          const r = e.currentTarget.getBoundingClientRect();
          setOrigin({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
          setOpen(true);
        }}
      >
        <Icon name="camera" size={20} />
        {t("take")}
      </button>
      <input ref={fallback} type="file" accept="image/*" capture="environment" hidden onChange={(e) => e.target.files?.[0] && onCapture(e.target.files[0])} />
      <Sheet open={open} onClose={() => setOpen(false)} origin={origin} title={t("take")}>
        {open && <Camera onCapture={onCapture} onClose={() => setOpen(false)} />}
      </Sheet>
    </>
  );
}
