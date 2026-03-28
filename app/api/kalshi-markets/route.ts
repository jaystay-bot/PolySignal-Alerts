import { NextResponse } from "next/server";

const KALSHI_API = "https://api.elections.kalshi.com/trade-api/v2";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

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

function within30d(dt: Date): boolean {
  const now = Date.now();
  return dt.getTime() > now && dt.getTime() <= now + THIRTY_DAYS_MS;
}

export async function GET() {
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
      volume: number;
      liquidity: number;
    }[] = [];

    for (const m of raw) {
      const endDt = parseEndDate(m.end_date ?? m.expiration_time ?? m.close_time);
      if (!endDt || !within30d(endDt)) continue;

      const volume = parseFloat(m.volume_fp ?? "0") || 0;
      const liquidity = parseFloat(m.open_interest_fp ?? "0") || 0;
      if (volume === 0 || liquidity === 0) continue;

      const yesPrice = parseFloat(m.yes_ask_dollars ?? m.last_price_dollars ?? "0") || 0;
      if (yesPrice <= 0 || yesPrice >= 1) continue;

      const ratio = Math.round((volume / liquidity) * 10) / 10;
      const noPrice = Math.round((1 - yesPrice) * 100) / 100;

      markets.push({
        id: m.ticker ?? m.id ?? "",
        title: m.title ?? m.subtitle ?? "Unknown market",
        yesPrice: Math.round(yesPrice * 100) / 100,
        noPrice,
        ratio,
        volume,
        liquidity,
      });
    }

    markets.sort((a, b) => b.ratio - a.ratio);

    const strongEdges = markets.filter((m) => m.ratio >= 3).length;
    const bestRatio = markets.length > 0 ? markets[0].ratio : 0;

    return NextResponse.json({
      markets,
      stats: {
        scanned: markets.length,
        strongEdges,
        bestRatio,
      },
    });
  } catch {
    return NextResponse.json({ markets: [], stats: { scanned: 0, strongEdges: 0, bestRatio: 0 } });
  }
}
