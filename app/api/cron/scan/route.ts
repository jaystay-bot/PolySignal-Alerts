import { NextResponse } from "next/server";

// ── Config ──────────────────────────────────────────────────────────────────
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID!;
const KALSHI_REFERRAL_URL =
  process.env.KALSHI_REFERRAL_URL ?? "https://kalshi.com";

const POLYMARKET_API = "https://gamma-api.polymarket.com";

// Signal thresholds — DO NOT CHANGE
const MIN_VOLUME = 2000;
const MIN_LIQUIDITY = 10000;
const MIN_YES = 0.05;
const MAX_YES = 0.95;
const SIGNAL_RATIO = 25;
const STRONG_RATIO = 40;
const COOLDOWN_MS = 60 * 60 * 1000; // 60 min

// ── In-memory cooldown (reset on cold start, acceptable for serverless) ────
const cooldowns = new Map<string, number>();

// ── Types ───────────────────────────────────────────────────────────────────
interface Market {
  id?: string;
  conditionId?: string;
  question?: string;
  volume?: string | number;
  liquidity?: string | number;
  outcomePrices?: string;
}

interface Signal {
  marketId: string;
  question: string;
  verdict: string;
  confidence: number;
  ratio: number;
  yesPrice: number;
  target: number;
  windowClose: string;
}

// ── Polymarket ──────────────────────────────────────────────────────────────
async function fetchMarkets(): Promise<Market[]> {
  const url = `${POLYMARKET_API}/markets?active=true&closed=false&limit=500`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Polymarket API ${res.status}`);
  return res.json();
}

// ── Signal detection ────────────────────────────────────────────────────────
function parseYesPrice(m: Market): number {
  try {
    const raw = m.outcomePrices ?? "[0,0]";
    return parseFloat(raw.replace(/[\[\]]/g, "").split(",")[0]);
  } catch {
    return 0;
  }
}

function detectSignal(m: Market): Signal | null {
  const volume = Number(m.volume ?? 0);
  const liquidity = Number(m.liquidity ?? 0);
  const yesPrice = parseYesPrice(m);

  if (volume < MIN_VOLUME || liquidity < MIN_LIQUIDITY) return null;
  if (yesPrice < MIN_YES || yesPrice > MAX_YES) return null;

  const ratio = volume / liquidity;
  if (ratio < SIGNAL_RATIO) return null;

  const marketId = m.id ?? m.conditionId ?? "";
  const last = cooldowns.get(marketId);
  if (last && Date.now() - last < COOLDOWN_MS) return null;

  const verdict = ratio >= STRONG_RATIO ? "STRONG EDGE" : "EDGE";
  const confidence = Math.min(Math.floor((ratio / 50) * 100), 99);
  const target = Math.round((yesPrice + 0.04) * 100) / 100;
  const windowClose = new Date(Date.now() + 30 * 60 * 1000)
    .toISOString()
    .slice(11, 16) + " UTC";

  return {
    marketId,
    question: m.question ?? "Unknown market",
    verdict,
    confidence,
    ratio: Math.round(ratio * 10) / 10,
    yesPrice: Math.round(yesPrice * 100) / 100,
    target,
    windowClose,
  };
}

// ── Alert formatting ────────────────────────────────────────────────────────
function explanation(sig: Signal): string {
  if (sig.verdict === "STRONG EDGE") {
    return `Heavy volume hitting this market at ${sig.ratio}x the liquidity — smart money is moving before the book catches up.`;
  }
  return `Volume is outpacing liquidity at ${sig.ratio}x — early momentum suggests YES has room to run.`;
}

function formatAlert(sig: Signal): string {
  return [
    `⚡ SIGNAL DETECTED`,
    ``,
    sig.question,
    `Verdict: ${sig.verdict}`,
    `Confidence: ${sig.confidence}% | Ratio: ${sig.ratio}x`,
    ``,
    `Entry: YES at $${sig.yesPrice}`,
    `Target: $${sig.target}`,
    `Window: ~30 minutes`,
    ``,
    `"${explanation(sig)}"`,
    ``,
    `⏰ Window closes: ${sig.windowClose}`,
    ``,
    `🔗 Bet on Kalshi → ${KALSHI_REFERRAL_URL}`,
  ].join("\n");
}

// ── Telegram ────────────────────────────────────────────────────────────────
async function sendTelegram(text: string): Promise<void> {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHANNEL_ID, text }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram ${res.status}: ${body}`);
  }
}

// ── Cron handler ────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  // Vercel cron sends Authorization header — optional check
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const markets = await fetchMarkets();
    let sent = 0;

    for (const market of markets) {
      const sig = detectSignal(market);
      if (!sig) continue;

      await sendTelegram(formatAlert(sig));
      cooldowns.set(sig.marketId, Date.now());
      sent++;
    }

    return NextResponse.json({ ok: true, scanned: markets.length, sent });
  } catch (err) {
    console.error("Scan error:", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
