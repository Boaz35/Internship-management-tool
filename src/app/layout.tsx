import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Internship Program",
  description: "Manage the design studio internship program.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
