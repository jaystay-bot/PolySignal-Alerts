export type Platform = "Kalshi" | "Polymarket";

export type Verdict = "STRONG EDGE" | "EDGE" | "WATCH";

export type Category = "Politics" | "Economics" | "Sports" | "Crypto";

export interface Market {
  id: string;
  question: string;
  platform: Platform;
  yesPrice: number;
  volume: number;
  liquidity: number;
  category: Category | null;
  betUrl: string;
}

export type PriceWarning =
  | "Longshot Trap — historically overpriced"
  | "Near-certainty — low upside"
  | null;

export interface Signal extends Market {
  category: Category;
  ratio: number;
  impliedProbability: number;
  verdict: Verdict;
  confidence: number;
  betReturn: number;
  explanation: string;
  priceWarning: PriceWarning;
  kellyBet: number;
}
