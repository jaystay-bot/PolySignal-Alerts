import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PolySignal — Real-Time Prediction Market Signals",
  description:
    "Free liquidity imbalance alerts from Polymarket, delivered to Telegram.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-gray-100 antialiased">{children}</body>
    </html>
  );
}
