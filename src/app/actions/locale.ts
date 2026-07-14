"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, resolveLocale } from "@/i18n/request";

// Persist the UI language choice in a cookie (read by src/i18n/request.ts).
// One year, site-wide, survives sign-out/in.
export async function setLocale(value: string) {
  const locale = resolveLocale(value);
  cookies().set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return locale;
}
