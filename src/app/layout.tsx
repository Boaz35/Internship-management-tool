import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Internship Program",
  description: "Manage the design studio internship program.",
  icons: { icon: "/zemingo/favicon.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
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
      <body>{children}</body>
    </html>
  );
}
