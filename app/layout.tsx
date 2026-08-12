import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const imageUrl = new URL("/og-community.png", origin).toString();

  return {
    metadataBase: new URL(origin),
    title: "DabReady — Heat. Cool. Ready.",
    description: "A one-tap heat and cooldown timer with a live, pseudonymous community room.",
    icons: { icon: "/icon.svg", shortcut: "/icon.svg" },
    manifest: "/manifest.webmanifest",
    openGraph: {
      title: "DabReady",
      description: "Heat. Cool. Ready. See who's live and share how your session landed.",
      type: "website",
      images: [{ url: imageUrl, width: 1747, height: 909, alt: "DabReady heat and cooldown timer" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "DabReady",
      description: "Heat. Cool. Ready. See who's live and share how your session landed.",
      images: [imageUrl],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
