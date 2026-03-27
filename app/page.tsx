"use client";

import { useEffect, useState } from "react";
import {
  Zap,
  TrendingUp,
  Trophy,
  RefreshCw,
  ExternalLink,
  Send,
  Filter,
} from "lucide-react";

import type { Signal } from "@/types";

const CATEGORIES = ["All", "Politics", "Economics", "Sports", "Crypto"];

// ── Component ───────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [topPicks, setTopPicks] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("All");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const filtered =
    category === "All"
      ? signals
      : signals.filter((s) => s.category === category);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Header */}
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Zap className="h-8 w-8 text-emerald-400" />
          <h1 className="text-3xl font-bold tracking-tight">
            Poly<span className="text-emerald-400">Signal</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
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
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </header>

      {/* Last updated */}
      {lastUpdated && (
        <p className="mb-6 text-xs text-gray-500">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg bg-red-900/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Top Picks */}
      {topPicks.length > 0 && (
        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            <h2 className="text-xl font-bold">Top Picks</h2>
            <span className="ml-2 rounded bg-amber-400/10 px-2 py-0.5 text-xs font-semibold text-amber-400">
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

      {/* Category Filter */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto">
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

      {/* Signals List */}
      {loading && signals.length === 0 ? (
        <div className="py-20 text-center text-gray-500">
          <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin" />
          Scanning markets...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-gray-500">
          No signals found{category !== "All" ? ` in ${category}` : ""}.
          Markets are quiet right now.
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((sig) => (
            <SignalCard key={sig.id} signal={sig} />
          ))}
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-800 pt-6 text-center text-xs text-gray-600">
        <p>
          PolySignal scans Kalshi &amp; Polymarket every 5 minutes for liquidity
          imbalance signals.
        </p>
        <a
          href="https://t.me/PolySignalAlerts"
          className="mt-1 inline-block text-emerald-500 hover:underline"
        >
          t.me/PolySignalAlerts
        </a>
      </footer>
    </div>
  );
}

// ── Top Pick Card ───────────────────────────────────────────────────────────
function TopPickCard({ signal, rank }: { signal: Signal; rank: number }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-gray-900 p-5">
      <span className="absolute right-3 top-3 text-3xl font-black text-amber-500/20">
        #{rank}
      </span>
      <span className="mb-2 inline-block rounded bg-amber-400/10 px-2 py-0.5 text-xs font-semibold text-amber-400">
        TOP PICK
      </span>
      <h3 className="mb-3 line-clamp-2 text-sm font-semibold leading-snug">
        {signal.question}
      </h3>
      <div className="mb-3 text-lg font-bold text-emerald-400">
        Bet $100 → Win ${signal.betReturn}
      </div>
      <div className="mb-3 flex flex-wrap gap-2 text-xs text-gray-400">
        <span>Probability: {Math.round(signal.yesPrice * 100)}%</span>
        <span>·</span>
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
        <span>·</span>
        <span>{signal.platform}</span>
      </div>
      <a
        href={signal.betUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2 text-sm font-bold text-gray-950 transition hover:bg-emerald-400"
      >
        Bet on {signal.platform}
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

// ── Signal Card ─────────────────────────────────────────────────────────────
function SignalCard({ signal }: { signal: Signal }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 transition hover:border-gray-700">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {/* Badges */}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 text-xs font-bold ${
                signal.verdict === "STRONG EDGE"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-yellow-500/10 text-yellow-400"
              }`}
            >
              {signal.verdict}
            </span>
            <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
              {signal.category}
            </span>
            <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
              {signal.platform}
            </span>
          </div>

          {/* Question */}
          <h3 className="mb-2 text-sm font-semibold leading-snug sm:text-base">
            {signal.question}
          </h3>

          {/* Payout line */}
          <div className="mb-1 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <span className="text-lg font-bold text-emerald-400">
              Bet $100 → Win ${signal.betReturn}
            </span>
          </div>

          {/* Stats */}
          <div className="mb-2 flex flex-wrap gap-3 text-xs text-gray-400">
            <span>Probability: {Math.round(signal.yesPrice * 100)}%</span>
            <span>Ratio: {signal.ratio}x</span>
            <span>
              Vol: ${signal.volume >= 1000000
                ? (signal.volume / 1000000).toFixed(1) + "M"
                : signal.volume >= 1000
                  ? (signal.volume / 1000).toFixed(0) + "K"
                  : signal.volume}
            </span>
          </div>

          {/* Explanation */}
          <p className="text-xs leading-relaxed text-gray-500">
            {signal.explanation}
          </p>
        </div>

        {/* Bet button */}
        <a
          href={signal.betUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-gray-950 transition hover:bg-emerald-400"
        >
          BET
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
