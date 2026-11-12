import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

export const locales = ["en", "nl"] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async () => {
  const jar = await cookies();
  let locale = jar.get("NEXT_LOCALE")?.value as Locale | undefined;
  if (!locale || !locales.includes(locale)) {
    const accept = (await headers()).get("accept-language") ?? "";
    locale = accept.toLowerCase().startsWith("nl") ? "nl" : "en";
  }
  return { locale, messages: (await import(`../../messages/${locale}.json`)).default };
});
