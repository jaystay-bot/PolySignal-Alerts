import type { Market, Signal, Verdict, Category, PriceWarning } from "@/types";

// ── Thresholds — DO NOT CHANGE ─────────────────────────────────────────────
const MIN_VOLUME = 10000;
const MIN_YES = 0.05;
const MAX_YES = 0.95;
const EDGE_RATIO = 25;
const STRONG_RATIO = 40;

// ── Category keywords ──────────────────────────────────────────────────────
const CATEGORY_KEYWORDS: Record<Category, string[]> = {
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

// ── Categorize ─────────────────────────────────────────────────────────────
export function categorize(question: string): Category | null {
  const q = question.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => q.includes(kw))) return cat as Category;
  }
  return null;
}

// ── Compute verdict ────────────────────────────────────────────────────────
function getVerdict(ratio: number): Verdict {
  if (ratio >= STRONG_RATIO) return "STRONG EDGE";
  if (ratio >= EDGE_RATIO) return "EDGE";
  return "WATCH";
}

// ── Build explanation ──────────────────────────────────────────────────────
function buildExplanation(
  verdict: Verdict,
  ratio: number,
  yesPrice: number,
  platform: string,
): string {
  if (verdict === "STRONG EDGE") {
    return `Volume is crushing liquidity at ${ratio}x on ${platform} — heavy money flowing in before the odds adjust.`;
  }
  if (verdict === "EDGE") {
    return `Volume outpacing liquidity at ${ratio}x on ${platform} — momentum favors YES at $${yesPrice}.`;
  }
  return `Ratio at ${ratio}x on ${platform} — worth watching but not actionable yet.`;
}

// ── Mispricing warning ────────────────────────────────────────────────────
function getPriceWarning(yesPrice: number): PriceWarning {
  if (yesPrice < 0.20) return "Longshot Trap — historically overpriced";
  if (yesPrice > 0.80) return "Near-certainty — low upside";
  return null;
}

// ── Kelly bet size ───────────────────────────────────────────────────────
const DEFAULT_BANKROLL = 1000;
const KELLY_FRACTION = 0.25; // quarter-Kelly for safety

function calcKellyBet(confidence: number, yesPrice: number): number {
  const p = confidence / 100;
  const odds = (1 - yesPrice) / yesPrice; // decimal odds minus 1
  const kelly = (p * odds - (1 - p)) / odds;
  if (kelly <= 0) return 0;
  return Math.round(kelly * KELLY_FRACTION * DEFAULT_BANKROLL);
}

// ── Main engine ────────────────────────────────────────────────────────────
export function analyzeMarket(market: Market): Signal | null {
  const { volume, liquidity, yesPrice, platform, question } = market;

  // Hard filters
  if (volume < MIN_VOLUME || liquidity <= 0) return null;
  if (yesPrice < MIN_YES || yesPrice > MAX_YES) return null;

  const ratio = Math.round((volume / liquidity) * 10) / 10;
  const verdict = getVerdict(ratio);

  // Only return EDGE or STRONG EDGE (filter out WATCH)
  if (verdict === "WATCH") return null;

  const category = market.category ?? categorize(question);
  if (!category) return null;

  const impliedProbability = Math.round(yesPrice * 100);
  const confidence = Math.min(Math.floor((ratio / 50) * 100), 99);
  const betReturn = Math.round((1 / yesPrice) * 100);

  return {
    ...market,
    category,
    ratio,
    impliedProbability,
    verdict,
    confidence,
    betReturn,
    explanation: buildExplanation(verdict, ratio, yesPrice, platform),
    priceWarning: getPriceWarning(yesPrice),
    kellyBet: calcKellyBet(confidence, yesPrice),
  };
}

// ── Batch helper ───────────────────────────────────────────────────────────
export function analyzeMarkets(markets: Market[]): Signal[] {
  return markets
    .map(analyzeMarket)
    .filter((s): s is Signal => s !== null)
    .sort((a, b) => b.ratio - a.ratio);
}
