import { NextResponse } from "next/server";

// ── Constants ───────────────────────────────────────────────────────────────
const KALSHI_API = "https://api.elections.kalshi.com/trade-api/v2";
const POLYMARKET_API = "https://gamma-api.polymarket.com";

const MIN_VOLUME = 10000;
const SIGNAL_RATIO = 25;
const STRONG_RATIO = 40;

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Politics: [
    "president", "election", "trump", "biden", "congress", "senate",
    "governor", "democrat", "republican", "vote", "political", "party",
    "harris", "desantis", "primary", "nominee", "white house", "cabinet",
    "impeach", "poll",
  ],
  Economics: [
    "fed", "interest rate", "inflation", "gdp", "recession", "stock",
    "s&p", "nasdaq", "dow", "jobs", "unemployment", "cpi", "tariff",
    "trade", "economy", "market", "treasury", "debt ceiling", "oil",
    "gas price",
  ],
  Sports: [
    "nba", "nfl", "mlb", "nhl", "soccer", "football", "basketball",
    "baseball", "hockey", "champion", "super bowl", "world series",
    "playoff", "mvp", "ufc", "boxing", "tennis", "golf", "f1",
    "world cup",
  ],
  Crypto: [
    "bitcoin", "btc", "ethereum", "eth", "crypto", "solana", "sol",
    "dogecoin", "doge", "xrp", "blockchain", "defi", "nft", "token",
    "altcoin", "binance", "coinbase",
  ],
};

// ── Types ───────────────────────────────────────────────────────────────────
export interface Signal {
  id: string;
  question: string;
  platform: "Kalshi" | "Polymarket";
  category: string;
  yesPrice: number;
  volume: number;
  liquidity: number;
  ratio: number;
  verdict: "STRONG EDGE" | "EDGE";
  confidence: number;
  payout: number;
  explanation: string;
  betUrl: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function categorize(question: string): string | null {
  const q = question.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => q.includes(kw))) return cat;
  }
  return null;
}

function buildExplanation(sig: {
  verdict: string;
  ratio: number;
  yesPrice: number;
  platform: string;
}): string {
  if (sig.verdict === "STRONG EDGE") {
    return `Volume is crushing liquidity at ${sig.ratio}x on ${sig.platform} — heavy money flowing in before the odds adjust.`;
  }
  return `Volume outpacing liquidity at ${sig.ratio}x on ${sig.platform} — momentum favors YES at $${sig.yesPrice}.`;
}

// ── Kalshi ──────────────────────────────────────────────────────────────────
async function fetchKalshi(): Promise<Signal[]> {
  const url = `${KALSHI_API}/markets?status=open&limit=200`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];

  const data = await res.json();
  const markets = data.markets ?? [];
  const signals: Signal[] = [];

  for (const m of markets) {
    const volume = Number(m.volume ?? 0);
    const liquidity = Number(m.open_interest ?? m.liquidity ?? 0);
    if (volume < MIN_VOLUME || liquidity <= 0) continue;

    const yesPrice =
      Number(m.yes_ask ?? m.last_price ?? 0) / 100; // Kalshi uses cents
    if (yesPrice < 0.05 || yesPrice > 0.95) continue;

    const ratio = Math.round((volume / liquidity) * 10) / 10;
    if (ratio < SIGNAL_RATIO) continue;

    const category = categorize(m.title ?? m.subtitle ?? "");
    if (!category) continue;

    const verdict: "STRONG EDGE" | "EDGE" =
      ratio >= STRONG_RATIO ? "STRONG EDGE" : "EDGE";

    signals.push({
      id: m.ticker ?? m.id,
      question: m.title ?? m.subtitle ?? "Unknown",
      platform: "Kalshi",
      category,
      yesPrice: Math.round(yesPrice * 100) / 100,
      volume,
      liquidity,
      ratio,
      verdict,
      confidence: Math.min(Math.floor((ratio / 50) * 100), 99),
      payout: Math.round((1 / yesPrice) * 100),
      explanation: "",
      betUrl:
        "https://kalshi.com/sign-up/?referral=68cedd79-0e8c-4d29-a28a-86d83bde7df6",
    });
  }

  // Fill explanations
  for (const s of signals) {
    s.explanation = buildExplanation(s);
  }

  return signals;
}

// ── Polymarket ──────────────────────────────────────────────────────────────
async function fetchPolymarket(): Promise<Signal[]> {
  const url = `${POLYMARKET_API}/markets?active=true&closed=false&limit=200`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];

  const markets = await res.json();
  const signals: Signal[] = [];

  for (const m of markets) {
    const volume = Number(m.volume ?? 0);
    const liquidity = Number(m.liquidity ?? 0);
    if (volume < MIN_VOLUME || liquidity <= 0) continue;

    let yesPrice = 0;
    try {
      yesPrice = parseFloat(
        (m.outcomePrices ?? "[0,0]").replace(/[\[\]]/g, "").split(",")[0]
      );
    } catch {
      continue;
    }
    if (yesPrice < 0.05 || yesPrice > 0.95) continue;

    const ratio = Math.round((volume / liquidity) * 10) / 10;
    if (ratio < SIGNAL_RATIO) continue;

    const category = categorize(m.question ?? "");
    if (!category) continue;

    const verdict: "STRONG EDGE" | "EDGE" =
      ratio >= STRONG_RATIO ? "STRONG EDGE" : "EDGE";

    signals.push({
      id: m.id ?? m.conditionId,
      question: m.question ?? "Unknown",
      platform: "Polymarket",
      category,
      yesPrice: Math.round(yesPrice * 100) / 100,
      volume,
      liquidity,
      ratio,
      verdict,
      confidence: Math.min(Math.floor((ratio / 50) * 100), 99),
      payout: Math.round((1 / yesPrice) * 100),
      explanation: "",
      betUrl: "https://polymarket.com",
    });
  }

  for (const s of signals) {
    s.explanation = buildExplanation(s);
  }

  return signals;
}

// ── Handler ─────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const [kalshi, poly] = await Promise.all([
      fetchKalshi().catch(() => [] as Signal[]),
      fetchPolymarket().catch(() => [] as Signal[]),
    ]);

    const all = [...kalshi, ...poly].sort((a, b) => b.ratio - a.ratio);
    const topPicks = all.slice(0, 3);

    return NextResponse.json({ signals: all, topPicks });
  } catch (err) {
    console.error("Signal fetch error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
