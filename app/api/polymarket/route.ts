import { NextResponse } from "next/server";
import type { Market } from "@/types";
import { analyzeMarkets, categorize } from "@/lib/signalEngine";

const POLYMARKET_API = "https://gamma-api.polymarket.com";

export async function GET() {
  try {
    const res = await fetch(
      `${POLYMARKET_API}/markets?active=true&closed=false&limit=200`,
      { cache: "no-store" },
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Polymarket API returned ${res.status}` },
        { status: 502 },
      );
    }

    const raw: Record<string, unknown>[] = await res.json();

    const markets: Market[] = [];
    for (const m of raw) {
      const question = (m.question as string) ?? "";

      let yesPrice = 0;
      try {
        const prices = ((m.outcomePrices as string) ?? "[0,0]")
          .replace(/[\[\]"\\]/g, "")
          .split(",");
        yesPrice = parseFloat(prices[0].trim());
      } catch {
        continue;
      }

      markets.push({
        id: (m.id as string) ?? (m.conditionId as string) ?? "",
        question,
        platform: "Polymarket",
        yesPrice: Math.round(yesPrice * 100) / 100,
        volume: Number(m.volume ?? 0),
        liquidity: Number(m.liquidity ?? 0),
        category: categorize(question),
        betUrl: "https://polymarket.com",
      });
    }

    const signals = analyzeMarkets(markets);

    return NextResponse.json({
      platform: "Polymarket",
      totalFetched: raw.length,
      signals,
    });
  } catch (err) {
    console.error("Polymarket fetch error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
