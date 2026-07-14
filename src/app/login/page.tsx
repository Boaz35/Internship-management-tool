"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { LanguageToggle } from "@/components/LanguageToggle";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const [loading, setLoading] = useState(false);
  const t = useTranslations("login");
  const errorKey: Record<string, string> = {
    domain: "errorDomain",
    auth_failed: "errorAuthFailed",
    missing_code: "errorMissingCode",
  };
  const errorMessage = searchParams.error
    ? t(errorKey[searchParams.error] ?? "errorGeneric")
    : null;

  async function signIn() {
    setLoading(true);
    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const domain = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN;

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
        queryParams: domain
          ? { hd: domain, prompt: "select_account" }
          : { prompt: "select_account" },
      },
    });
  }

  const domain = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div style={{ position: "fixed", top: 16, right: 20, zIndex: 50 }}>
        <LanguageToggle />
      </div>
      <div
        style={{
          width: 380,
          background: "var(--surface)",
          borderRadius: 34,
          padding: "40px 36px 36px",
          boxShadow: "var(--ring)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            overflow: "hidden",
            margin: "0 auto",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/zemingo/symbol.jpg"
            alt="Zemingo"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>

        <h1 style={{ margin: "20px 0 0", fontSize: 24, fontWeight: 500, letterSpacing: "-0.45px" }}>
          {t("title")}
        </h1>
        <p style={{ margin: "8px 0 0", fontSize: 15, color: "var(--label-secondary)", lineHeight: "20px" }}>
          {t("subtitle")}
        </p>

        {errorMessage && (
          <p
            style={{
              margin: "16px 0 0",
              borderRadius: 12,
              padding: "10px 14px",
              color: "var(--terracotta)",
              background: "rgba(177,74,60,0.1)",
              fontSize: 14,
            }}
          >
            {errorMessage}
          </p>
        )}

        <button
          onClick={signIn}
          disabled={loading}
          className="flex w-full items-center justify-center gap-[9px]"
          style={{
            marginTop: 28,
            height: 48,
            border: "none",
            borderRadius: 100,
            background: "var(--fill-tertiary)",
            color: "#000",
            fontSize: 17,
            fontWeight: 500,
            letterSpacing: "-0.43px",
            cursor: "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          <GoogleIcon />
          {loading ? t("redirecting") : t("continueWithGoogle")}
        </button>

        <p style={{ margin: "16px 0 0", fontSize: 13, color: "var(--label-tertiary)" }}>
          {domain ? t("restricted", { domain }) : t("restrictedGeneric")}
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
