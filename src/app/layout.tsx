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
      default: "Care Governance Hub",
      template: "%s | Care Governance Hub",
    },
    description:
      "A secure governance and compliance evidence hub for UK adult social care providers.",
    openGraph: {
      title: "Care Governance Hub",
      description: "Clear evidence. Calm governance.",
      type: "website",
      images: [{ url: "/og.png", width: 1536, height: 910 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Care Governance Hub",
      description: "Clear evidence. Calm governance.",
      images: ["/og.png"],
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
