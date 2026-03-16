import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grant Tracker — Funding Organiser",
  description: "Centralised research funding tracker for SYNTHETICA Lab",
  icons: { icon: "/icon.png", apple: "/icon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#1e1e1e" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
