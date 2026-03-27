import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "PolySignal — Prediction Market Edge Dashboard",
  description:
    "Real-time liquidity imbalance signals from Kalshi and Polymarket.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-gray-950 text-gray-100 antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
