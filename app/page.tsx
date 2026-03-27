export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-8 text-center">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <span className="text-5xl">⚡</span>
          <h1 className="text-5xl font-bold tracking-tight">
            Poly<span className="text-emerald-400">Signal</span>
          </h1>
        </div>

        <p className="max-w-md text-lg text-gray-400">
          Real-time prediction market signals. Liquidity imbalance alerts
          delivered straight to Telegram.
        </p>

        <a
          href="https://t.me/PolySignalAlerts"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-emerald-500 px-8 py-3 text-lg font-semibold text-gray-950 transition hover:bg-emerald-400"
        >
          Join our Telegram
        </a>

        <p className="text-sm text-gray-600">Free signals — no signup required</p>
      </div>
    </main>
  );
}
