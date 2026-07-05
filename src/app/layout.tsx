import type { Metadata } from "next";
import { Newsreader, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DemoBanner from "@/components/DemoBanner";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-ibm-plex-sans",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
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
    <html
      lang="en"
      className={`${newsreader.variable} ${ibmPlexSans.variable}`}
    >
      <body className="min-h-screen flex flex-col">
        <DemoBanner />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
