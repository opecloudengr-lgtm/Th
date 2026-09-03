import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/providers";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jbmono = JetBrains_Mono({
  variable: "--font-jbmono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nexora — Registration, Ticketing & Access Control",
  description:
    "Create beautiful events, sell tickets, invite VIP guests, and verify entry at the door with secure QR tickets. Built for conferences, weddings, and everything in between.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${jbmono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-ink text-text-hi">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
