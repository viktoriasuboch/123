import "server-only";

/** USD per 1 unit of currency. USD is 1 by definition. Fallbacks are
 *  used when the FX API is unreachable so the "≈ $" total never breaks
 *  the page — it just shows slightly stale numbers. */
const FALLBACK: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  RUB: 0.011,
};

/**
 * Fetch USD conversion rates, cached for a day. Returns a map of
 * currency → USD-per-unit. On any failure (offline, API changed, needs
 * a key now) it falls back to constants — the dashboard's "≈ $ итого"
 * is a reference figure, not accounting truth.
 */
export async function getUsdRates(): Promise<Record<string, number>> {
  try {
    const res = await fetch(
      "https://api.exchangerate.host/latest?base=USD&symbols=EUR,GBP,RUB",
      { next: { revalidate: 86400 } },
    );
    if (!res.ok) throw new Error(`fx http ${res.status}`);
    const data = (await res.json()) as { rates?: Record<string, number> };
    const rates = data.rates;
    if (!rates || typeof rates.EUR !== "number") throw new Error("fx shape");
    const out: Record<string, number> = { USD: 1 };
    for (const c of ["EUR", "GBP", "RUB"]) {
      const r = rates[c];
      if (typeof r === "number" && r > 0) out[c] = 1 / r;
    }
    return { ...FALLBACK, ...out };
  } catch {
    return FALLBACK;
  }
}

/** Sum a per-currency bucket into an approximate USD figure. */
export function bucketToUsd(
  bucket: Record<string, number>,
  rates: Record<string, number>,
): number {
  let usd = 0;
  for (const [cur, amount] of Object.entries(bucket)) {
    usd += amount * (rates[cur] ?? 0);
  }
  return usd;
}
