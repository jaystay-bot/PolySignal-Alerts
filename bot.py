import os
import time
import logging
import asyncio
from datetime import datetime, timezone, timedelta

import httpx
import schedule
from dotenv import load_dotenv
from telegram import Bot

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# ── Config ──────────────────────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
TELEGRAM_CHANNEL_ID = os.environ["TELEGRAM_CHANNEL_ID"]
KALSHI_REFERRAL_URL = os.environ.get(
    "KALSHI_REFERRAL_URL",
    "https://kalshi.com/sign-up/?referral=68cedd79-0e8c-4d29-a28a-86d83bde7df6",
)

KALSHI_API = "https://api.elections.kalshi.com/trade-api/v2"
POLYMARKET_API = "https://gamma-api.polymarket.com"

# Signal thresholds — DO NOT CHANGE
MIN_VOLUME = 2000
MIN_LIQUIDITY = 10000
MIN_YES = 0.20
MAX_YES = 0.80
SIGNAL_RATIO = 8
STRONG_RATIO = 40

COOLDOWN_SECONDS = 60 * 60  # 60 min cooldown per market

# ── State ───────────────────────────────────────────────────────────────────
cooldowns: dict[str, float] = {}  # market_id -> timestamp of last alert
pending_followups: list[dict] = []  # queued follow-up checks

bot = Bot(token=TELEGRAM_BOT_TOKEN)


# ── Kalshi API (PRIMARY) ────────────────────────────────────────────────────
def fetch_kalshi_markets() -> list[dict]:
    url = f"{KALSHI_API}/events"
    params = {"status": "open", "limit": 200, "with_nested_markets": "true"}
    headers = {"Accept": "application/json"}
    with httpx.Client(timeout=30) as client:
        resp = client.get(url, params=params, headers=headers)
        resp.raise_for_status()
        events = resp.json().get("events", [])
        markets = []
        for event in events:
            markets.extend(event.get("markets", []))
        # Sort by volume descending, return top 200
        markets.sort(key=lambda m: float(m.get("volume_fp", 0) or 0), reverse=True)
        return markets[:200]


# ── Polymarket API (SECONDARY) ─────────────────────────────────────────────
def fetch_polymarket_markets() -> list[dict]:
    url = f"{POLYMARKET_API}/markets"
    params = {"active": "true", "closed": "false", "limit": 200}
    with httpx.Client(timeout=30) as client:
        resp = client.get(url, params=params)
        resp.raise_for_status()
        return resp.json()


def fetch_market_detail(market_id: str) -> dict | None:
    url = f"{POLYMARKET_API}/markets/{market_id}"
    with httpx.Client(timeout=15) as client:
        try:
            resp = client.get(url)
            resp.raise_for_status()
            return resp.json()
        except Exception:
            return None


# ── Helpers ─────────────────────────────────────────────────────────────────
MAX_RESOLVE_HOURS = 72


def parse_end_date(raw) -> datetime | None:
    """Parse an end/expiration date string into a timezone-aware datetime, or None."""
    if not raw:
        return None
    if isinstance(raw, (int, float)):
        return datetime.fromtimestamp(raw, tz=timezone.utc)
    for fmt in ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%d"):
        try:
            return datetime.strptime(raw, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def within_72h(end_dt: datetime) -> bool:
    now = datetime.now(timezone.utc)
    return now < end_dt <= now + timedelta(hours=MAX_RESOLVE_HOURS)


def is_cooled_down(market_id: str) -> bool:
    last = cooldowns.get(market_id)
    if last is None:
        return True
    return (time.time() - last) > COOLDOWN_SECONDS


def within_30d(end_dt: datetime) -> bool:
    now = datetime.now(timezone.utc)
    return now < end_dt <= now + timedelta(days=30)


def compute_kalshi_signal(market: dict) -> dict | None:
    end_dt = parse_end_date(
        market.get("end_date") or market.get("expiration_time") or market.get("close_time")
    )

    try:
        volume = float(market.get("volume_fp", 0) or market.get("volume", 0) or 0)
        liquidity = float(market.get("open_interest_fp", 0) or market.get("liquidity_dollars", 0) or 0)
        # Kalshi prices are in dollar strings like "0.5500"
        yes_raw = market.get("yes_ask_dollars", 0) or market.get("last_price_dollars", 0) or 0
        yes_price = float(yes_raw)
    except (ValueError, IndexError):
        return None

    if volume < MIN_VOLUME or liquidity < MIN_LIQUIDITY:
        return None
    if not (MIN_YES <= yes_price <= MAX_YES):
        return None

    ratio = volume / liquidity
    if ratio < SIGNAL_RATIO:
        return None

    market_id = market.get("ticker", market.get("id", ""))
    if not is_cooled_down(market_id):
        return None

    verdict = "STRONG EDGE" if ratio >= STRONG_RATIO else "EDGE"
    confidence = min(int((ratio / 50) * 100), 99)
    target = round(yes_price + 0.04, 2)

    window_close = (
        datetime.fromtimestamp(time.time() + 1800, tz=timezone.utc).strftime("%H:%M UTC")
    )

    return {
        "market_id": market_id,
        "question": market.get("title", market.get("subtitle", "Unknown market")),
        "verdict": verdict,
        "confidence": confidence,
        "ratio": round(ratio, 1),
        "yes_price": round(yes_price, 2),
        "target": target,
        "window_close": window_close,
        "entry_time": time.time(),
        "end_date": end_dt.isoformat(),
    }


def compute_signal(market: dict) -> dict | None:
    end_dt = parse_end_date(
        market.get("endDate") or market.get("end_date_iso") or market.get("end_date")
    )

    try:
        volume = float(market.get("volume", 0) or 0)
        liquidity = float(market.get("liquidity", 0) or 0)
        yes_price = float(
            market.get("outcomePrices", "[0,0]").strip("[]").split(",")[0]
        )
    except (ValueError, IndexError):
        return None

    if volume < MIN_VOLUME or liquidity < MIN_LIQUIDITY:
        return None
    if not (MIN_YES <= yes_price <= MAX_YES):
        return None

    ratio = volume / liquidity
    if ratio < SIGNAL_RATIO:
        return None

    market_id = market.get("id", market.get("conditionId", ""))
    if not is_cooled_down(market_id):
        return None

    verdict = "STRONG EDGE" if ratio >= STRONG_RATIO else "EDGE"
    confidence = min(int((ratio / 50) * 100), 99)
    target = round(yes_price + 0.04, 2)

    window_close = (
        datetime.fromtimestamp(time.time() + 1800, tz=timezone.utc).strftime("%H:%M UTC")
    )

    return {
        "market_id": market_id,
        "question": market.get("question", "Unknown market"),
        "verdict": verdict,
        "confidence": confidence,
        "ratio": round(ratio, 1),
        "yes_price": round(yes_price, 2),
        "target": target,
        "window_close": window_close,
        "entry_time": time.time(),
        "end_date": end_dt.isoformat(),
    }


def generate_explanation(sig: dict) -> str:
    if sig["verdict"] == "STRONG EDGE":
        return (
            f"Heavy volume hitting this market at {sig['ratio']}x the liquidity — "
            f"smart money is moving before the book catches up."
        )
    return (
        f"Volume is outpacing liquidity at {sig['ratio']}x — "
        f"early momentum suggests YES has room to run."
    )


def format_alert(sig: dict) -> str:
    end_dt = datetime.fromisoformat(sig["end_date"])
    end_label = end_dt.strftime("%b %d %H:%M UTC")
    return (
        f"\u26a1 SIGNAL DETECTED\n\n"
        f"{sig['question']}\n"
        f"Verdict: {sig['verdict']}\n"
        f"Confidence: {sig['confidence']}% | Ratio: {sig['ratio']}x\n\n"
        f"\U0001f7e2 BET YES\n\n"
        f"Entry: YES at ${sig['yes_price']}\n"
        f"Target: ${sig['target']}\n"
        f"Resolves: {end_label}\n"
        f"Window: ~30 minutes\n\n"
        f"\"{generate_explanation(sig)}\"\n\n"
        f"\u23f0 Window closes: {sig['window_close']}\n\n"
        f"\U0001f517 Bet on Kalshi \u2192 {KALSHI_REFERRAL_URL}"
    )


def format_followup(sig: dict, current_price: float) -> str:
    entry = sig["yes_price"]
    if current_price > entry:
        result = "\u2705 Moved up"
    elif current_price < entry:
        result = "\u274c Moved down"
    else:
        result = "\u26a0\ufe0f Flat"

    return (
        f"\U0001f4ca SIGNAL UPDATE\n\n"
        f"{sig['question']}\n"
        f"Entry: ${entry}\n"
        f"Current: ${current_price}\n"
        f"Result: {result}\n\n"
        f"Next scan in 5 minutes."
    )


# ── Send to Telegram (sync wrapper) ────────────────────────────────────────
def send_telegram(text: str) -> None:
    asyncio.run(bot.send_message(chat_id=TELEGRAM_CHANNEL_ID, text=text))


# ── Core Loop ───────────────────────────────────────────────────────────────
def _send_signals(signals: list[dict]) -> int:
    sent = 0
    for sig in signals:
        msg = format_alert(sig)
        try:
            send_telegram(msg)
            cooldowns[sig["market_id"]] = time.time()
            pending_followups.append(sig)
            sent += 1
            log.info(f"Alert sent: {sig['question'][:60]}...")
        except Exception as e:
            log.error(f"Failed to send alert: {e}")
    return sent


def scan_markets():
    log.info("Scanning markets...")
    total_sent = 0

    all_signals = []

    # PRIMARY: Kalshi
    try:
        kalshi_markets = fetch_kalshi_markets()
        if kalshi_markets:
            import json
            for i in range(min(3, len(kalshi_markets))):
                m = kalshi_markets[i]
                vol = float(m.get("volume_fp", 0) or 0)
                oi = float(m.get("open_interest_fp", 0) or 0)
                ratio = vol / oi if oi > 0 else 0
                log.info(f"DEBUG Kalshi market {i+1}: {json.dumps(m, default=str)}")
                log.info(f"DEBUG Kalshi volume_fp: {m.get('volume_fp')}")
                log.info(f"DEBUG Kalshi open_interest_fp: {m.get('open_interest_fp')}")
                log.info(f"DEBUG Kalshi ratio: {ratio}")
        kalshi_signals = [s for m in kalshi_markets if (s := compute_kalshi_signal(m)) is not None]
        all_signals.extend(kalshi_signals)
        log.info(f"Kalshi: {len(kalshi_signals)} signals found")
    except Exception as e:
        log.error(f"Failed to fetch Kalshi markets: {e}")

    # SECONDARY: Polymarket
    try:
        poly_markets = fetch_polymarket_markets()
        if poly_markets:
            import json
            for i in range(min(3, len(poly_markets))):
                log.info(f"DEBUG Poly market {i+1}: {json.dumps(poly_markets[i], default=str)}")
        poly_signals = [s for m in poly_markets if (s := compute_signal(m)) is not None]
        all_signals.extend(poly_signals)
        log.info(f"Polymarket: {len(poly_signals)} signals found")
    except Exception as e:
        log.error(f"Failed to fetch Polymarket markets: {e}")

    # Sort by soonest end_date first
    all_signals.sort(key=lambda s: s["end_date"])

    total_sent = _send_signals(all_signals)
    log.info(f"Scan complete. {total_sent} signal(s) sent.")


def check_followups():
    now = time.time()
    due = [s for s in pending_followups if (now - s["entry_time"]) >= 1800]

    for sig in due:
        pending_followups.remove(sig)
        detail = fetch_market_detail(sig["market_id"])
        if detail is None:
            continue

        try:
            current_price = float(
                detail.get("outcomePrices", "[0,0]").strip("[]").split(",")[0]
            )
        except (ValueError, IndexError):
            continue

        msg = format_followup(sig, round(current_price, 2))
        try:
            send_telegram(msg)
            log.info(f"Follow-up sent: {sig['question'][:60]}...")
        except Exception as e:
            log.error(f"Failed to send follow-up: {e}")


# ── Entry Point ─────────────────────────────────────────────────────────────
def main():
    log.info("PolySignal bot starting...")

    # Run first scan immediately
    scan_markets()

    # Schedule recurring jobs
    schedule.every(5).minutes.do(scan_markets)
    schedule.every(1).minutes.do(check_followups)

    log.info("Scheduled: scan every 5m, follow-ups checked every 1m.")

    while True:
        schedule.run_pending()
        time.sleep(1)


if __name__ == "__main__":
    main()
