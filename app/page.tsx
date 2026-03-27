import {
  Zap,
  Send,
  ScanSearch,
  Brain,
  BellRing,
  ArrowRight,
  ShieldCheck,
  BarChart3,
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-emerald-400" />
            <span className="text-xl font-bold tracking-tight">
              Poly<span className="text-emerald-400">Signal</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://t.me/PolySignalAlerts"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium transition hover:bg-gray-700 sm:flex"
            >
              <Send className="h-4 w-4" />
              Telegram
            </a>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-gray-950 transition hover:bg-emerald-400"
            >
              Open Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Gradient orbs */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -top-20 left-1/4 h-[300px] w-[400px] rounded-full bg-sky-500/5 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-4 pb-20 pt-24 text-center sm:pt-32">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 text-sm text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            Scanning Kalshi &amp; Polymarket every 5 minutes
          </div>

          <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            Stop guessing.
            <br />
            <span className="text-emerald-400">Start finding edge.</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl">
            We scan Kalshi and Polymarket every 5 minutes and surface only the
            markets with mathematical edge. No noise. No opinions. Just data.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-3.5 text-lg font-bold text-gray-950 transition hover:bg-emerald-400"
            >
              <BarChart3 className="h-5 w-5" />
              View Live Signals
            </Link>
            <a
              href="https://t.me/PolySignalAlerts"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-900 px-8 py-3.5 text-lg font-medium transition hover:border-gray-600 hover:bg-gray-800"
            >
              <Send className="h-5 w-5 text-sky-400" />
              Join Telegram
            </a>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="border-t border-gray-800/50 bg-gray-900/30">
        <div className="mx-auto max-w-5xl px-4 py-20">
          <h2 className="mb-4 text-center text-3xl font-bold">How it works</h2>
          <p className="mx-auto mb-14 max-w-xl text-center text-gray-500">
            Three simple steps from market data to actionable edge.
          </p>

          <div className="grid gap-8 sm:grid-cols-3">
            {/* Step 1 */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
                <ScanSearch className="h-7 w-7 text-emerald-400" />
              </div>
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                Step 1
              </div>
              <h3 className="mb-2 text-lg font-bold">We scan the markets</h3>
              <p className="text-sm leading-relaxed text-gray-500">
                Every 5 minutes we pull live data from Kalshi and Polymarket —
                volume, liquidity, and prices across hundreds of markets.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10">
                <Brain className="h-7 w-7 text-sky-400" />
              </div>
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-sky-400">
                Step 2
              </div>
              <h3 className="mb-2 text-lg font-bold">Detect liquidity edge</h3>
              <p className="text-sm leading-relaxed text-gray-500">
                Our signal engine calculates the volume-to-liquidity ratio. When
                it spikes above 25x, smart money is moving before the book
                adjusts.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
                <BellRing className="h-7 w-7 text-amber-400" />
              </div>
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                Step 3
              </div>
              <h3 className="mb-2 text-lg font-bold">Get the alert</h3>
              <p className="text-sm leading-relaxed text-gray-500">
                See signals on the dashboard or get them pushed to your phone
                via Telegram — with verdict, confidence, and one-click bet
                links.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="border-t border-gray-800/50">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h2 className="mb-4 text-3xl font-bold">
            Ready to find your edge?
          </h2>
          <p className="mb-8 text-gray-500">
            Free signals. No signup. No paywall.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-3.5 text-lg font-bold text-gray-950 transition hover:bg-emerald-400"
            >
              Open Dashboard
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="https://t.me/PolySignalAlerts"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-400 transition hover:text-emerald-400"
            >
              <Send className="h-4 w-4" />
              or join us on Telegram
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-800/50 py-8 text-center text-xs text-gray-600">
        <div className="flex items-center justify-center gap-2">
          <Zap className="h-3.5 w-3.5 text-emerald-400/50" />
          <span>PolySignal</span>
        </div>
        <p className="mt-1">
          Prediction market edge scanner.{" "}
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
