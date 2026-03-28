"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Zap,
  TrendingUp,
  RefreshCw,
  Send,
  Filter,
  ArrowUpDown,
  ScanSearch,
  Flame,
  BarChart3,
  AlertTriangle,
  DollarSign,
  Clock,
  Activity,
  X,
  Info,
} from "lucide-react";
import type { Signal } from "@/types";

// ── Constants ───────────────────────────────────────────────────────────────
const CATEGORIES = ["All", "Politics", "Economics", "Sports", "Crypto"] as const;
const SORT_OPTIONS = [
  { key: "ratio", label: "Edge Score" },
  { key: "volume", label: "Volume" },
  { key: "betReturn", label: "Return" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["key"];

// ── Helpers ─────────────────────────────────────────────────────────────────
function fmtVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Constants for timeframe tabs ──────────────────────────────────────────
const TIMEFRAMES = [
  { days: 3, label: "3 Days" },
  { days: 7, label: "7 Days" },
  { days: 30, label: "30 Days" },
] as const;

// ── Types for Kalshi market feed ───────────────────────────────────────────
interface KalshiMarket {
  id: string;
  title: string;
  yesPrice: number;
  noPrice: number;
  ratio: number;
  direction: "YES" | "NO";
  volume: number;
  liquidity: number;
  endDate: string;
}

interface KalshiStats {
  scanned: number;
  strongEdges: number;
  bestRatio: number;
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [kalshiMarkets, setKalshiMarkets] = useState<KalshiMarket[]>([]);
  const [kalshiStats, setKalshiStats] = useState<KalshiStats>({ scanned: 0, strongEdges: 0, bestRatio: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [sortBy, setSortBy] = useState<SortKey>("ratio");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [timeLabel, setTimeLabel] = useState("");
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [timeframe, setTimeframe] = useState(7);
  const [expandedMarket, setExpandedMarket] = useState<string | null>(null);

  // Fetch signals + kalshi markets
  async function fetchSignals(days: number = timeframe) {
    setLoading(true);
    setError("");
    try {
      const [sigRes, kalshiRes] = await Promise.all([
        fetch("/api/signals").catch(() => null),
        fetch(`/api/kalshi-markets?days=${days}`).catch(() => null),
      ]);

      if (sigRes?.ok) {
        const data = await sigRes.json();
        setSignals(data.signals ?? []);
      }

      if (kalshiRes?.ok) {
        const data = await kalshiRes.json();
        setKalshiMarkets(data.markets ?? []);
        setKalshiStats(data.stats ?? { scanned: 0, strongEdges: 0, bestRatio: 0 });
      }

      setLastUpdated(new Date());
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }

  // Refetch when timeframe changes
  function handleTimeframe(days: number) {
    setTimeframe(days);
    fetchSignals(days);
  }

  // Initial fetch + 60s auto-refresh
  useEffect(() => {
    fetchSignals();
    const interval = setInterval(() => fetchSignals(), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Tick the "time ago" label every 5s
  useEffect(() => {
    const tick = () => {
      if (lastUpdated) setTimeLabel(timeAgo(lastUpdated));
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  // Filtered + sorted + split by platform
  const sortFn = (a: Signal, b: Signal) => {
    if (sortBy === "ratio") return b.ratio - a.ratio;
    if (sortBy === "volume") return b.volume - a.volume;
    return b.betReturn - a.betReturn;
  };

  const filtered = useMemo(() => {
    let list =
      category === "All"
        ? [...signals]
        : signals.filter((s) => s.category === category);
    list.sort(sortFn);
    return list;
  }, [signals, category, sortBy]);

  const kalshiSignals = useMemo(
    () => filtered.filter((s) => s.platform === "Kalshi"),
    [filtered],
  );
  const polySignals = useMemo(
    () => filtered.filter((s) => s.platform === "Polymarket"),
    [filtered],
  );

  // Stats — prefer kalshiStats from the dedicated route
  const stats = useMemo(() => ({
    totalScanned: kalshiStats.scanned || signals.length,
    strongEdges: kalshiStats.strongEdges || signals.filter((s) => s.verdict === "STRONG EDGE").length,
    bestRatio: kalshiStats.bestRatio || (signals.length > 0 ? Math.max(...signals.map((s) => s.ratio)) : 0),
  }), [signals, kalshiStats]);

  return (
    <div className="min-h-screen bg-gray-950">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-gray-800/50 bg-gray-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <Zap className="h-7 w-7 text-emerald-400" />
              <h1 className="text-2xl font-bold tracking-tight">
                Poly<span className="text-emerald-400">Signal</span>
              </h1>
            </Link>
            <p className="mt-0.5 text-xs text-gray-500">
              Live Prediction Market Edge Scanner &middot; polysignal.co
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Updated {timeLabel}
              </span>
            )}
            <a
              href="https://t.me/PolySignalAlerts"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium transition hover:bg-sky-500"
            >
              <Send className="h-4 w-4" />
              Join Telegram
            </a>
            <button
              onClick={() => fetchSignals()}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium transition hover:bg-gray-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* ── Kalshi Banner ────────────────────────────────────────────── */}
        {!bannerDismissed && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-sm text-sky-300">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
            <p className="flex-1">
              Polymarket unavailable in US. Kalshi is fully legal in all 50 states.
            </p>
            <button
              onClick={() => setBannerDismissed(true)}
              className="shrink-0 text-gray-500 transition hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────────────── */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-900/30 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* ── Live Status ──────────────────────────────────────────────── */}
        <div className="mb-8 flex items-center gap-2 text-sm text-gray-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Live signals updating every 5 minutes
        </div>

        {/* ── Stats Bar ────────────────────────────────────────────────── */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={<ScanSearch className="h-4 w-4 text-sky-400" />}
            label="Markets Scanned"
            value={stats.totalScanned.toString()}
          />
          <StatCard
            icon={<Flame className="h-4 w-4 text-emerald-400" />}
            label="Strong Edges"
            value={stats.strongEdges.toString()}
          />
          <StatCard
            icon={<BarChart3 className="h-4 w-4 text-amber-400" />}
            label="Best Ratio"
            value={stats.bestRatio > 0 ? `${stats.bestRatio}x` : "—"}
          />
          <StatCard
            icon={<Clock className="h-4 w-4 text-purple-400" />}
            label="Last Signal"
            value={timeLabel || "—"}
          />
        </div>

        {/* ── Filters + Sort ───────────────────────────────────────────── */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Category tabs */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <Filter className="h-4 w-4 shrink-0 text-gray-500" />
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  category === cat
                    ? "bg-emerald-500 text-gray-950"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-gray-500" />
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  sortBy === opt.key
                    ? "bg-gray-700 text-white"
                    : "bg-gray-800/50 text-gray-400 hover:bg-gray-800"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Kalshi Market Feed ──────────────────────────────────────── */}
        <section className="mb-10">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-bold">Kalshi Signal Feed</h2>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.days}
                  onClick={() => handleTimeframe(tf.days)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    timeframe === tf.days
                      ? "bg-emerald-500 text-gray-950"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
          {kalshiMarkets.length > 0 ? (
            <div className="grid gap-3">
              {kalshiMarkets.map((m) => {
                const isExpanded = expandedMarket === m.id;
                return (
                  <div
                    key={m.id}
                    className="rounded-lg border border-gray-800 bg-gray-900 transition hover:border-gray-700"
                  >
                    <button
                      onClick={() => setExpandedMarket(isExpanded ? null : m.id)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left"
                    >
                      <div className="min-w-0 flex-1 pr-4">
                        <h3 className="truncate text-sm font-medium">{m.title}</h3>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-400">
                          <span>YES: <span className="text-emerald-400">${m.yesPrice}</span></span>
                          <span>NO: <span className="text-red-400">${m.noPrice}</span></span>
                          <span>Resolves: {fmtDate(m.endDate)}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        {m.direction === "YES" ? (
                          <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-400">
                            🟢 YES
                          </span>
                        ) : (
                          <span className="rounded bg-red-500/10 px-2 py-0.5 text-xs font-bold text-red-400">
                            🔴 NO
                          </span>
                        )}
                        <span className={`text-sm font-bold ${m.ratio >= 3 ? "text-emerald-400" : "text-gray-400"}`}>
                          {m.ratio}x
                        </span>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-gray-800 px-4 py-4">
                        <h4 className="mb-3 text-sm font-semibold">{m.title}</h4>
                        <div className="mb-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                          <div>
                            <span className="text-gray-500">YES Price</span>
                            <p className="font-bold text-emerald-400">${m.yesPrice}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">NO Price</span>
                            <p className="font-bold text-red-400">${m.noPrice}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Volume</span>
                            <p className="font-bold">{fmtVolume(m.volume)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Resolves</span>
                            <p className="font-bold">{fmtDate(m.endDate)}</p>
                          </div>
                        </div>
                        <a
                          href="https://kalshi.com/sign-up/?referral=68cedd79-0e8c-4d29-a28a-86d83bde7df6"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 text-sm font-bold text-gray-950 transition hover:bg-emerald-400"
                        >
                          Bet on Kalshi →
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-gray-500">
              No markets resolving within {timeframe} days.
            </p>
          )}
        </section>

        {/* ── Signal Cards ─────────────────────────────────────────────── */}
        {loading && signals.length === 0 ? (
          <EmptyState loading />
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Section 1: Kalshi */}
            {kalshiSignals.length > 0 && (
              <section className="mb-10">
                <div className="mb-4 flex items-center gap-2">
                  <h2 className="text-lg font-bold">Top Kalshi Picks</h2>
                  <span className="rounded-full bg-emerald-400/10 px-3 py-0.5 text-xs font-semibold text-emerald-400">
                    US Legal — Bet Now
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {kalshiSignals.map((sig) => (
                    <SignalCard key={sig.id} signal={sig} />
                  ))}
                </div>
              </section>
            )}

            {/* Section 2: Polymarket */}
            {polySignals.length > 0 && (
              <section className="mb-10">
                <div className="mb-4 flex items-center gap-2">
                  <h2 className="text-lg font-bold">Top Polymarket Picks</h2>
                  <span className="rounded-full bg-gray-700/50 px-3 py-0.5 text-xs font-semibold text-gray-400">
                    Not available in US yet
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {polySignals.map((sig) => (
                    <SignalCard key={sig.id} signal={sig} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="mt-12 border-t border-gray-800/50 py-6 text-center text-xs text-gray-600">
        <p>
          PolySignal scans Kalshi &amp; Polymarket every 5 minutes.{" "}
          <a
            href="https://t.me/PolySignalAlerts"
            className="text-emerald-500/70 hover:underline"
          >
            t.me/PolySignalAlerts
          </a>
        </p>
      </footer>
    </div>
  );
}

// ── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
        {icon}
        {label}
      </div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

// ── Signal Card ─────────────────────────────────────────────────────────────
function SignalCard({ signal }: { signal: Signal }) {
  const verdictColor =
    signal.verdict === "STRONG EDGE"
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";

  return (
    <div className="flex flex-col justify-between rounded-xl border border-gray-800 bg-gray-900 p-5 transition hover:border-gray-700">
      {/* Top section */}
      <div>
        {/* Badges */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className={`rounded border px-2 py-0.5 text-xs font-bold ${verdictColor}`}>
            {signal.verdict}
          </span>
          <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
            {signal.platform}
          </span>
          <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
            {signal.category}
          </span>
        </div>
        <p className="mb-2 text-[10px] text-gray-500">US betting via Kalshi</p>

        {/* Bet direction */}
        {signal.yesPrice < 0.50 ? (
          <span className="mb-2 inline-block rounded bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400">
            🟢 BET YES
          </span>
        ) : (
          <span className="mb-2 inline-block rounded bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-400">
            🔴 BET NO
          </span>
        )}

        {/* Question */}
        <h3 className="mb-3 line-clamp-2 text-sm font-semibold leading-snug sm:text-base">
          {signal.question}
        </h3>

        {/* Payout */}
        <div className="mb-2 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          <span className="text-lg font-bold text-emerald-400">
            Bet $100 → Win ${signal.betReturn}
          </span>
        </div>

        {/* Stats row */}
        <div className="mb-2 flex flex-wrap gap-3 text-xs text-gray-400">
          <span>Probability: {signal.impliedProbability}%</span>
          <span>Ratio: {signal.ratio}x</span>
          <span>Vol: {fmtVolume(signal.volume)}</span>
        </div>

        {/* Confidence bar */}
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-gray-500">Confidence</span>
            <span className="font-medium text-gray-300">{signal.confidence}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
            <div
              className={`h-full rounded-full transition-all ${
                signal.confidence >= 70
                  ? "bg-emerald-500"
                  : signal.confidence >= 50
                    ? "bg-yellow-500"
                    : "bg-gray-500"
              }`}
              style={{ width: `${signal.confidence}%` }}
            />
          </div>
        </div>

        {/* Mispricing warning */}
        {signal.priceWarning && (
          <div className="mb-2 flex items-center gap-1.5 rounded bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {signal.priceWarning}
          </div>
        )}

        {/* Explanation */}
        <p className="mb-3 text-xs leading-relaxed text-gray-500">
          {signal.explanation}
        </p>

        {/* Kelly bet */}
        {signal.kellyBet > 0 && (
          <div className="mb-4 flex items-center gap-1.5 rounded bg-emerald-500/5 px-2.5 py-1.5 text-xs font-medium text-emerald-400">
            <DollarSign className="h-3.5 w-3.5 shrink-0" />
            Bet ${signal.kellyBet} of $1000 bankroll
          </div>
        )}
      </div>

      {/* Bet button */}
      <div>
        <a
          href="https://kalshi.com/sign-up/?referral=68cedd79-0e8c-4d29-a28a-86d83bde7df6"
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 text-sm font-bold text-gray-950 transition hover:bg-emerald-400"
        >
          Bet on Kalshi →
        </a>
        <a
          href="https://kalshi.com/sign-up/?referral=68cedd79-0e8c-4d29-a28a-86d83bde7df6"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 block text-center text-xs text-gray-500 hover:text-gray-400 transition"
        >
          New to Kalshi? It&apos;s free to join →
        </a>
      </div>
    </div>
  );
}

// ── Empty State ─────────────────────────────────────────────────────────────
function EmptyState({ loading = false }: { loading?: boolean }) {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      {loading ? (
        <>
          <RefreshCw className="mb-4 h-10 w-10 animate-spin text-gray-600" />
          <p className="text-gray-500">Scanning markets...</p>
        </>
      ) : (
        <>
          <Activity className="mb-4 h-10 w-10 text-gray-700" />
          <p className="mb-1 text-lg font-medium text-gray-400">
            No strong signals right now.
          </p>
          <p className="text-sm text-gray-600">
            Check back in 5 minutes.
          </p>
        </>
      )}
    </div>
  );
}
