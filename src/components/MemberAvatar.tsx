"use client";
import { useApp } from "@/providers/Providers";

/** Whether this baby is shared between several parents. Everything "who did it" is hidden otherwise. */
export function useMultiParent() {
  const { baby } = useApp();
  return Object.keys(baby?.members ?? {}).length > 1;
}

/** Small round profile picture (Google photo) of the parent who made an entry. */
export function MemberAvatar({ uid, size = 22 }: { uid: string; size?: number }) {
  const { baby } = useApp();
  const m = baby?.members?.[uid];
  if (!m) return null;
  const style = { width: size, height: size };
  return m.photoURL ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={m.photoURL} alt={m.name} title={m.name} referrerPolicy="no-referrer" className="shrink-0 rounded-full bg-line object-cover" style={style} />
  ) : (
    <span title={m.name} className="grid shrink-0 place-items-center rounded-full bg-accent font-extrabold text-accent-ink" style={{ ...style, fontSize: size * 0.46 }}>
      {(m.name || "?").slice(0, 1).toUpperCase()}
    </span>
  );
}
