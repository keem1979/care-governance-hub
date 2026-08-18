import type { Metadata } from "next";
import { headers } from "next/headers";
import { VoiceDictation } from "@/components/voice-dictation";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const baseUrl = host ? `${protocol}://${host}` : "http://localhost:3000";
  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: "Quality, Compliance and Governance Management System — QCGMS",
      template: "%s | QCGMS",
    },
    description:
      "Continuous governance, assurance and evidence-backed action closure for UK adult social care providers.",
    icons: {
      icon: "/atom-logo.png",
      apple: "/atom-logo.png",
    },
    openGraph: {
      title: "ATOM QCGMS — Continuous assurance for adult social care",
      description: "Know what is unsafe, overdue or unverified and demonstrate that improvement has been completed and sustained.",
      type: "website",
      images: [{ url: "/og-phase0.png", width: 1536, height: 910 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "ATOM QCGMS — Continuous assurance for adult social care",
      description: "Evidence-backed governance, action closure and management oversight for UK adult social care.",
      images: ["/og-phase0.png"],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">
        {children}
        <VoiceDictation />
      </body>
    </html>
  );
}
