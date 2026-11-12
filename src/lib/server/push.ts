import "server-only";
import * as webpush from "web-push";
import { adminDb } from "./admin";

let configured = false;
function setup() {
  if (configured) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/** Send to every device of a user; prune dead subscriptions. Returns number delivered. */
export async function sendToUser(uid: string, payload: PushPayload): Promise<number> {
  setup();
  const col = adminDb().collection(`users/${uid}/pushSubscriptions`);
  const snap = await col.get();
  let ok = 0;
  await Promise.all(
    snap.docs.map(async (d) => {
      try {
        await webpush.sendNotification(d.data().subscription, JSON.stringify(payload), { TTL: 3600, urgency: "normal" });
        ok++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await d.ref.delete();
      }
    }),
  );
  return ok;
}
