import { NextResponse } from "next/server";
import type { Market } from "@/types";
import { analyzeMarkets, categorize } from "@/lib/signalEngine";

const KALSHI_API = "https://api.elections.kalshi.com/trade-api/v2";
const KALSHI_REFERRAL =
  "https://kalshi.com/sign-up/?referral=68cedd79-0e8c-4d29-a28a-86d83bde7df6";

export async function GET() {
  try {
    const res = await fetch(`${KALSHI_API}/markets?status=open&limit=200`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Kalshi API returned ${res.status}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    const raw = data.markets ?? [];

    const markets: Market[] = [];
    for (const m of raw) {
      const question = m.title ?? m.subtitle ?? "";
      const yesPrice = Number(m.yes_ask ?? m.last_price ?? 0) / 100;

      markets.push({
        id: m.ticker ?? m.id ?? "",
        question,
        platform: "Kalshi",
        yesPrice: Math.round(yesPrice * 100) / 100,
        volume: Number(m.volume ?? 0),
        liquidity: Number(m.open_interest ?? m.liquidity ?? 0),
        category: categorize(question),
        betUrl: KALSHI_REFERRAL,
      });
    }

    const signals = analyzeMarkets(markets);

    return NextResponse.json({
      platform: "Kalshi",
      totalFetched: raw.length,
      signals,
    });
  } catch (err) {
    console.error("Kalshi fetch error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
