/**
 * Basic User-Agent heuristic to flag obvious automated traffic (search
 * crawlers, headless browsers, common HTTP clients). This is intentionally
 * simple — a real bot/fraud-detection system (behavioral signals, rate
 * anomalies, device fingerprinting) is explicitly out of scope for Phase 7
 * and would be introduced alongside the future payout system.
 */
const BOT_PATTERNS =
  /bot|crawler|spider|headless|curl|wget|python-requests|scrapy|phantomjs|puppeteer/i;

export function isLikelyBot(userAgent: string | null | undefined): boolean {
  if (!userAgent || userAgent.trim() === "") return true; // no UA at all is suspicious
  return BOT_PATTERNS.test(userAgent);
}
