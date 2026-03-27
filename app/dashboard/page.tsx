"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Zap,
  TrendingUp,
  Trophy,
  RefreshCw,
  ExternalLink,
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

// ── Page ────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [topPicks, setTopPicks] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [sortBy, setSortBy] = useState<SortKey>("ratio");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [timeLabel, setTimeLabel] = useState("");

  // Fetch signals
  async function fetchSignals() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/signals");
      if (!res.ok) throw new Error("Failed to fetch signals");
      const data = await res.json();
      setSignals(data.signals ?? []);
      setTopPicks(data.topPicks ?? []);
      setLastUpdated(new Date());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  // Initial fetch + 60s auto-refresh
  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 60 * 1000);
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

  // Filtered + sorted
  const filtered = useMemo(() => {
    let list =
      category === "All"
        ? [...signals]
        : signals.filter((s) => s.category === category);
    list.sort((a, b) => {
      if (sortBy === "ratio") return b.ratio - a.ratio;
      if (sortBy === "volume") return b.volume - a.volume;
      return b.betReturn - a.betReturn;
    });
    return list;
  }, [signals, category, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const strongEdges = signals.filter((s) => s.verdict === "STRONG EDGE").length;
    const bestRatio = signals.length > 0 ? Math.max(...signals.map((s) => s.ratio)) : 0;
    const totalScanned = signals.length;
    return { strongEdges, bestRatio, totalScanned };
  }, [signals]);

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
              Live Prediction Market Edge Scanner
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
              onClick={fetchSignals}
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
        {/* ── Error ────────────────────────────────────────────────────── */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-900/30 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* ── Top Picks ────────────────────────────────────────────────── */}
        {topPicks.length > 0 && (
          <section className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-bold">Top Picks</h2>
              <span className="ml-1 rounded-full bg-amber-400/10 px-3 py-0.5 text-xs font-semibold text-amber-400">
                Highest edge across both platforms
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {topPicks.map((sig, i) => (
                <TopPickCard key={sig.id} signal={sig} rank={i + 1} />
              ))}
            </div>
          </section>
        )}

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

        {/* ── Signal Cards ─────────────────────────────────────────────── */}
        {loading && signals.length === 0 ? (
          <EmptyState loading />
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((sig) => (
              <SignalCard key={sig.id} signal={sig} />
            ))}
          </div>
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

// ── Top Pick Card ───────────────────────────────────────────────────────────
function TopPickCard({ signal, rank }: { signal: Signal; rank: number }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-gray-900 p-5 shadow-lg shadow-emerald-500/5">
      {/* Glow effect */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />

      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <span className="rounded bg-emerald-400/10 px-2 py-0.5 text-xs font-bold text-emerald-400">
            TOP PICK #{rank}
          </span>
          <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
            {signal.platform}
          </span>
        </div>

        <h3 className="mb-3 line-clamp-2 text-sm font-semibold leading-snug">
          {signal.question}
        </h3>

        <div className="mb-1 text-xl font-bold text-emerald-400">
          Bet $100 → Win ${signal.betReturn}
        </div>

        <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
          <span>Probability: {signal.impliedProbability}%</span>
          <span>
            Edge:{" "}
            <span
              className={
                signal.verdict === "STRONG EDGE"
                  ? "font-bold text-emerald-400"
                  : "font-bold text-yellow-400"
              }
            >
              {signal.verdict === "STRONG EDGE" ? "STRONG" : "MODERATE"}
            </span>
          </span>
          <span>Ratio: {signal.ratio}x</span>
        </div>

        {signal.priceWarning && (
          <div className="mb-3 flex items-center gap-1.5 rounded bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-400">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            {signal.priceWarning}
          </div>
        )}

        {signal.kellyBet > 0 && (
          <div className="mb-4 flex items-center gap-1.5 text-xs text-gray-400">
            <DollarSign className="h-3 w-3 text-emerald-400" />
            Bet ${signal.kellyBet} of $1000 bankroll
          </div>
        )}

        <a
          href={signal.betUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 text-sm font-bold text-gray-950 transition hover:bg-emerald-400"
        >
          Bet on {signal.platform}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
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
      <a
        href={signal.betUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 text-sm font-bold text-gray-950 transition hover:bg-emerald-400"
      >
        BET on {signal.platform}
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
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
