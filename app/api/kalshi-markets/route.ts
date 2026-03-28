import { NextResponse } from "next/server";

const KALSHI_API = "https://api.elections.kalshi.com/trade-api/v2";

interface KalshiMarket {
  ticker?: string;
  id?: string;
  title?: string;
  subtitle?: string;
  end_date?: string;
  expiration_time?: string;
  close_time?: string;
  volume_fp?: string;
  open_interest_fp?: string;
  yes_ask_dollars?: string;
  last_price_dollars?: string;
}

function parseEndDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function withinDays(dt: Date, days: number): boolean {
  const now = Date.now();
  return dt.getTime() > now && dt.getTime() <= now + days * 24 * 60 * 60 * 1000;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const days = Math.min(Math.max(Number(url.searchParams.get("days")) || 7, 1), 30);

  try {
    const res = await fetch(
      `${KALSHI_API}/events?status=open&limit=200&with_nested_markets=true`,
      { cache: "no-store", headers: { Accept: "application/json" } },
    );

    if (!res.ok) {
      return NextResponse.json({ markets: [], stats: { scanned: 0, strongEdges: 0, bestRatio: 0 } });
    }

    const data = await res.json();
    const events = data.events ?? [];
    const raw: KalshiMarket[] = [];
    for (const ev of events) {
      for (const m of ev.markets ?? []) {
        raw.push(m);
      }
    }

    const markets: {
      id: string;
      title: string;
      yesPrice: number;
      noPrice: number;
      ratio: number;
      direction: "YES" | "NO";
      volume: number;
      liquidity: number;
    }[] = [];

    for (const m of raw) {
      const endDt = parseEndDate(m.end_date ?? m.expiration_time ?? m.close_time);
      if (!endDt || !withinDays(endDt, days)) continue;

      const volume = parseFloat(m.volume_fp ?? "0") || 0;
      const liquidity = parseFloat(m.open_interest_fp ?? "0") || 0;
      if (volume === 0 || liquidity === 0) continue;

      const yesPrice = parseFloat(m.yes_ask_dollars ?? m.last_price_dollars ?? "0") || 0;
      if (yesPrice <= 0 || yesPrice >= 1) continue;

      const noPrice = Math.round((1 - yesPrice) * 100) / 100;

      // Edge direction: flag the stronger side (higher price)
      // Ratio: higher price / lower price
      const higher = Math.max(yesPrice, noPrice);
      const lower = Math.min(yesPrice, noPrice);
      const ratio = lower > 0 ? Math.round((higher / lower) * 10) / 10 : 0;
      const direction: "YES" | "NO" = yesPrice >= noPrice ? "YES" : "NO";

      if (ratio <= 0) continue;

      markets.push({
        id: m.ticker ?? m.id ?? "",
        title: m.title ?? m.subtitle ?? "Unknown market",
        yesPrice: Math.round(yesPrice * 100) / 100,
        noPrice,
        ratio,
        direction,
        volume,
        liquidity,
      });
    }

    markets.sort((a, b) => b.ratio - a.ratio);
    const capped = markets.slice(0, 100);

    const strongEdges = capped.filter((m) => m.ratio >= 3).length;
    const bestRatio = capped.length > 0 ? capped[0].ratio : 0;

    return NextResponse.json({
      markets: capped,
      stats: {
        scanned: capped.length,
        strongEdges,
        bestRatio,
      },
    });
  } catch {
    return NextResponse.json({ markets: [], stats: { scanned: 0, strongEdges: 0, bestRatio: 0 } });
  }
}
