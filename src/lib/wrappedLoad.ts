import { collection, doc, getDoc, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { computeWrapped, periodBounds, type WrappedSummary } from "./wrapped";
import type { Baby, EventDoc } from "./types";

/** The saved Wrapped summary of a 3-month period, or one computed on the spot (read-only, nothing is written). */
export async function loadSummary(baby: Baby, n: number): Promise<WrappedSummary | null> {
  try {
    const saved = await getDoc(doc(db, "babies", baby.id, "wraps", String(n)));
    if (saved.exists()) return saved.data() as WrappedSummary;
    const { from, to } = periodBounds(baby.birthDate, n);
    const qs = await getDocs(query(collection(db, "babies", baby.id, "events"), where("start", ">=", from), where("start", "<", to), orderBy("start")));
    const events = qs.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<EventDoc, "id">) }));
    return computeWrapped(events, baby, n);
  } catch {
    return null;
  }
}
