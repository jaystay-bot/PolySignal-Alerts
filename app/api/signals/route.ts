import { NextResponse } from "next/server";
import type { Signal } from "@/types";

export async function GET(req: Request) {
  const base = new URL(req.url).origin;

  try {
    const [kalshiRes, polyRes] = await Promise.all([
      fetch(`${base}/api/kalshi`, { cache: "no-store" }).catch(() => null),
      fetch(`${base}/api/polymarket`, { cache: "no-store" }).catch(() => null),
    ]);

    const kalshi: Signal[] = kalshiRes?.ok
      ? ((await kalshiRes.json()).signals ?? [])
      : [];
    const poly: Signal[] = polyRes?.ok
      ? ((await polyRes.json()).signals ?? [])
      : [];

    const all = [...kalshi, ...poly].sort((a, b) => b.ratio - a.ratio);
    const topPicks = all.slice(0, 3);

    return NextResponse.json({ signals: all, topPicks });
  } catch (err) {
    console.error("Signal aggregation error:", err);
    return NextResponse.json({ error: "Failed to fetch signals" }, { status: 500 });
  }
}
