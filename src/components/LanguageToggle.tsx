"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { setLocale } from "@/app/actions/locale";

// Compact EN⇄HE switch. Writes the NEXT_LOCALE cookie via a server action,
// then refreshes so server components re-render in the new locale and <html>
// dir/lang flip.
export function LanguageToggle() {
  const locale = useLocale();
  const t = useTranslations("language");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: "he" | "en") {
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  const options: Array<{ code: "he" | "en"; label: string }> = [
    { code: "he", label: t("he") },
    { code: "en", label: t("en") },
  ];

  return (
    <div
      role="group"
      aria-label={t("toggle")}
      className="inline-flex items-center"
      style={{
        height: 32,
        padding: 3,
        borderRadius: 100,
        background: "var(--fill-tertiary)",
        gap: 2,
        opacity: pending ? 0.6 : 1,
      }}
    >
      {options.map((o) => {
        const active = o.code === locale;
        return (
          <button
            key={o.code}
            type="button"
            onClick={() => choose(o.code)}
            disabled={pending}
            aria-pressed={active}
            style={{
              height: 26,
              minWidth: 34,
              padding: "0 10px",
              borderRadius: 100,
              fontSize: 13,
              fontWeight: 500,
              cursor: active ? "default" : "pointer",
              background: active ? "var(--surface)" : "transparent",
              color: "#000",
              boxShadow: active ? "var(--ring)" : "none",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
