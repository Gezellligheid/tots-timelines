"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { collection, doc, onSnapshot, orderBy, query, where, updateDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { Baby, EventDoc, Reminder, UserDoc } from "@/lib/types";
import { DAY } from "@/lib/stats";

interface Ctx {
  authReady: boolean;
  user: User | null;
  userDoc: UserDoc | null | undefined; // undefined = loading, null = none
  babies: Baby[] | null;
  baby: Baby | null;
  events: EventDoc[];
  growth: EventDoc[];
  moments: EventDoc[];
  eventsReady: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  setActiveBaby: (id: string) => void;
  patchUser: (p: Partial<UserDoc>) => Promise<void>;
  toast: (msg: string, action?: { label: string; run: () => void }) => void;
  feedReminder: Reminder | null | undefined; // undefined = loading, null = none
  standalone: boolean;
  canInstall: boolean;
  promptInstall: () => Promise<void>;
}

const AppCtx = createContext<Ctx>(null!);
export const useApp = () => useContext(AppCtx);

const EVENT_WINDOW_DAYS = 35;

/** Listener error handler: permission-denied is expected while signing out or after a baby is deleted, so stay quiet; anything else is logged with the listener name. */
const onErr = (label: string) => (e: { code?: string; message?: string }) => {
  if (e.code === "permission-denied" && !auth.currentUser) return;
  console.warn(`[tots] Firestore listener "${label}" failed: ${e.code ?? e.message}`);
};

export function Providers({ children }: { children: React.ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null | undefined>(undefined);
  const [babies, setBabies] = useState<Baby[] | null>(null);
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [growth, setGrowth] = useState<EventDoc[]>([]);
  const [feedReminder, setFeedReminder] = useState<Reminder | null | undefined>(undefined);
  const [moments, setMoments] = useState<EventDoc[]>([]);
  const [eventsReady, setEventsReady] = useState(false);
  const [confirmed, setConfirmed] = useState<Record<string, true>>({});
  const [retry, setRetry] = useState(0);
  const [toastState, setToastState] = useState<{ id: number; msg: string; action?: { label: string; run: () => void } } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // PWA install state
  const deferredPrompt = useRef<{ prompt: () => Promise<void>; userChoice: Promise<unknown> } | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [standalone, setStandalone] = useState(false);
  useEffect(() => {
    setStandalone(window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as unknown as NonNullable<typeof deferredPrompt.current>;
      setCanInstall(true);
    };
    const onInstalled = () => {
      deferredPrompt.current = null;
      setCanInstall(false);
      setStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  const promptInstall = useCallback(async () => {
    const p = deferredPrompt.current;
    if (!p) return;
    await p.prompt();
    await p.userChoice;
    deferredPrompt.current = null;
    setCanInstall(false);
  }, []);

  useEffect(() => {
    getRedirectResult(auth).catch(() => {});
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
      if (!u) {
        setUserDoc(undefined);
        setBabies(null);
        setEvents([]);
      }
    });
  }, []);

  const uid = user?.uid;
  useEffect(() => {
    if (!uid) return;
    const u1 = onSnapshot(doc(db, "users", uid), (s) => setUserDoc(s.exists() ? (s.data() as UserDoc) : null), onErr("user"));
    const u2 = onSnapshot(
      query(collection(db, "babies"), where("memberUids", "array-contains", uid)),
      { includeMetadataChanges: true },
      (s) => {
        setBabies(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Baby, "id">) })));
        // Remember which babies the *server* has confirmed (a just-created baby exists locally first)
        const ok = s.docs.filter((d) => !d.metadata.hasPendingWrites).map((d) => d.id);
        if (ok.length) setConfirmed((prev) => (ok.every((id) => prev[id]) ? prev : { ...prev, ...Object.fromEntries(ok.map((id) => [id, true as const])) }));
      },
      onErr("babies"),
    );
    return () => {
      u1();
      u2();
    };
  }, [uid]);

  const baby = useMemo(() => {
    if (!babies?.length) return null;
    return babies.find((b) => b.id === userDoc?.activeBabyId) ?? babies[0];
  }, [babies, userDoc?.activeBabyId]);

  const babyId = baby?.id;
  useEffect(() => {
    setEvents([]);
    setGrowth([]);
    setMoments([]);
    setEventsReady(false);
    if (!babyId || !confirmed[babyId]) return;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const since = Date.now() - EVENT_WINDOW_DAYS * DAY;
    const col = collection(db, "babies", babyId, "events");
    const map = (s: { docs: { id: string; data: () => unknown }[] }) =>
      s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<EventDoc, "id">) }));
    const u1 = onSnapshot(query(col, where("start", ">=", since), orderBy("start", "desc")), (s) => {
      setEvents(map(s).filter((e) => e.type !== "growth" && e.type !== "moment"));
      setEventsReady(true);
    }, (e) => {
      onErr("events")(e);
      if (e.code === "permission-denied" && auth.currentUser) retryTimer = setTimeout(() => setRetry((n) => n + 1), 1500);
    });
    const u2 = onSnapshot(
      query(col, where("type", "in", ["growth", "moment"])),
      (s) => {
        const all = map(s).sort((a, b) => a.start - b.start);
        setGrowth(all.filter((e) => e.type === "growth"));
        setMoments(all.filter((e) => e.type === "moment").reverse());
      },
      onErr("long-lived"),
    );
    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      u1();
      u2();
    };
  }, [babyId, confirmed, retry]);

  // This parent's next-feed reminder for the active baby
  useEffect(() => {
    setFeedReminder(undefined);
    if (!uid || !babyId) return;
    return onSnapshot(
      doc(db, "reminders", `${uid}_${babyId}_feed`),
      (s) => setFeedReminder(s.exists() ? { id: s.id, ...(s.data() as Omit<Reminder, "id">) } : null),
      onErr("feedReminder"),
    );
  }, [uid, babyId]);

  // Per-baby accent colour
  useEffect(() => {
    const c = baby?.color ?? "lavender";
    document.documentElement.style.setProperty("--accent", `var(--${c})`);
    document.documentElement.style.setProperty("--accent-ink", `var(--${c}-ink)`);
  }, [baby?.color]);

  const signIn = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
    if (standalone) await signInWithRedirect(auth, provider);
    else await signInWithPopup(auth, provider);
  }, []);
  const signOut = useCallback(async () => {
    await fbSignOut(auth);
  }, []);
  const setActiveBaby = useCallback(
    (id: string) => {
      if (uid) void updateDoc(doc(db, "users", uid), { activeBabyId: id });
    },
    [uid],
  );
  const patchUser = useCallback(
    async (p: Partial<UserDoc>) => {
      if (uid) await setDoc(doc(db, "users", uid), p, { merge: true });
    },
    [uid],
  );
  const toast = useCallback((msg: string, action?: { label: string; run: () => void }) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastState({ id: Date.now(), msg, action });
    toastTimer.current = setTimeout(() => setToastState(null), 5000);
  }, []);

  const value = useMemo<Ctx>(
    () => ({ authReady, user, userDoc, babies, baby, events, growth, moments, eventsReady, signIn, signOut, setActiveBaby, patchUser, toast, feedReminder, standalone, canInstall, promptInstall }),
    [authReady, user, userDoc, babies, baby, events, growth, moments, eventsReady, signIn, signOut, setActiveBaby, patchUser, toast, feedReminder, standalone, canInstall, promptInstall],
  );

  return (
    <AppCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[80] flex justify-center px-4">
        <AnimatePresence>
          {toastState && (
            <motion.div
              key={toastState.id}
              initial={{ clipPath: "inset(0 50% 0 50% round 999px)", opacity: 0 }}
              animate={{ clipPath: "inset(0 0% 0 0% round 999px)", opacity: 1 }}
              exit={{ clipPath: "inset(0 50% 0 50% round 999px)", opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto flex items-center gap-4 rounded-full on-ink px-5 py-3 text-sm font-semibold shadow-xl"
            >
              <span>{toastState.msg}</span>
              {toastState.action && (
                <button
                  className="font-bold underline underline-offset-4"
                  onClick={() => {
                    toastState.action!.run();
                    setToastState(null);
                  }}
                >
                  {toastState.action.label}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppCtx.Provider>
  );
}
