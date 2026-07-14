import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export const locales = ["he", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "he";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function resolveLocale(value: string | undefined | null): Locale {
  return value === "en" ? "en" : "he";
}

export function dirForLocale(locale: Locale): "rtl" | "ltr" {
  return locale === "he" ? "rtl" : "ltr";
}

export default getRequestConfig(async () => {
  const cookieLocale = cookies().get(LOCALE_COOKIE)?.value;
  const locale = resolveLocale(cookieLocale);
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
