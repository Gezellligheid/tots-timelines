"use client";
import { useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useApp } from "@/providers/Providers";

/** Keeps this parent's name and Google profile picture on the baby, so everyone sees who logged what. */
export function MemberSync() {
  const { user, userDoc, baby } = useApp();
  useEffect(() => {
    if (!user || !baby || !userDoc) return;
    const m = baby.members?.[user.uid];
    const name = userDoc.displayName || user.displayName || "Parent";
    const photo = user.photoURL ?? userDoc.photoURL;
    const patch: Record<string, unknown> = {};
    if (!m) patch[`members.${user.uid}`] = { name, ...(userDoc.role ? { role: userDoc.role } : {}), ...(photo ? { photoURL: photo } : {}) };
    else {
      if (m.name !== name) patch[`members.${user.uid}.name`] = name;
      if (photo && m.photoURL !== photo) patch[`members.${user.uid}.photoURL`] = photo;
    }
    if (Object.keys(patch).length) void updateDoc(doc(db, "babies", baby.id), patch).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, baby?.id, baby?.members, userDoc?.displayName, userDoc?.role]);
  return null;
}
