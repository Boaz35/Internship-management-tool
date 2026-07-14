import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { dirForLocale, resolveLocale } from "@/i18n/request";
import "./globals.css";

export const metadata: Metadata = {
  title: "Internship Program",
  description: "Manage the design studio internship program.",
  icons: { icon: "/zemingo/favicon.png" },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = resolveLocale(await getLocale());
  const messages = await getMessages();
  const dir = dirForLocale(locale);

  return (
    <html lang={locale} dir={dir}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500&family=Frank+Ruhl+Libre:wght@300&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
