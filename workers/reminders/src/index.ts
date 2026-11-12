export interface Env {
  APP_URL: string;
  CRON_SECRET: string;
}

export default {
  async scheduled(_event: unknown, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }) {
    ctx.waitUntil(
      fetch(`${env.APP_URL}/api/cron/reminders`, {
        headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
      }).then(async (r) => {
        if (!r.ok) console.error("reminders cron failed", r.status, await r.text());
      }),
    );
  },
};
