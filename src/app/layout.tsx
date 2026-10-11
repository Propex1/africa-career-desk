import type { Metadata } from "next";
import "./fonts.css";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DemoBanner from "@/components/DemoBanner";
import { ACD_SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(ACD_SITE_URL),
  title: "Africa Career Desk",
  description:
    "Curated Africa-focused jobs, internships and programmes in finance, investment, infrastructure, climate, strategy and venture capital.",
  openGraph: {
    siteName: "Africa Career Desk",
    type: "website",
    title: "Africa Career Desk | Curated Africa-Focused Career Opportunities",
    description:
      "Curated Africa-focused jobs, internships and programmes in finance, investment, infrastructure, climate, strategy and venture capital.",
  },
  twitter: {
    card: "summary",
    title: "Africa Career Desk | Curated Africa-Focused Career Opportunities",
    description:
      "Curated Africa-focused jobs, internships and programmes in finance, investment, infrastructure, climate, strategy and venture capital.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fonts/acd/4b9bb515ce6d026f-s.p.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/acd/5611c55482296524-s.p.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/acd/26d4368bf94c0ec4-s.p.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen flex flex-col">
        <DemoBanner />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
