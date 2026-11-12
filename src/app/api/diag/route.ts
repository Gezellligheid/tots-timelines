// TEMPORARY diagnostics: reports whether server modules load and which env vars exist (never values).
export const dynamic = "force-dynamic";

const has = (k: string) => !!process.env[k];

export async function GET() {
  const out: Record<string, unknown> = { node: process.version, region: process.env.VERCEL_REGION ?? null };
  out.env = Object.fromEntries(
    [
      "NEXT_PUBLIC_FIREBASE_API_KEY",
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      "FIREBASE_ADMIN_PROJECT_ID",
      "FIREBASE_ADMIN_CLIENT_EMAIL",
      "FIREBASE_ADMIN_PRIVATE_KEY",
      "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
      "VAPID_PRIVATE_KEY",
      "VAPID_SUBJECT",
      "CRON_SECRET",
      "R2_ENDPOINT",
      "R2_BUCKET",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
    ].map((k) => [k, has(k)]),
  );
  const pk = process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "";
  out.privateKeyShape = {
    length: pk.length,
    hasBegin: pk.includes("BEGIN PRIVATE KEY"),
    hasRealNewlines: pk.includes("\n"),
    hasEscapedNewlines: pk.includes("\\n"),
    startsWithQuote: pk.startsWith('"') || pk.startsWith("'"),
  };
  const attempt = async (name: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      out[name] = "ok";
    } catch (e) {
      out[name] = String((e as Error)?.message ?? e).slice(0, 240);
    }
  };
  await attempt("loadAdminModule", () => import("@/lib/server/admin"));
  await attempt("adminInit", async () => (await import("@/lib/server/admin")).adminDb());
  await attempt("loadWebPush", () => import("web-push"));
  await attempt("vapidConfig", async () => {
    const wp = await import("web-push");
    wp.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  });
  await attempt("loadR2", () => import("@/lib/server/r2"));
  return Response.json(out);
}
