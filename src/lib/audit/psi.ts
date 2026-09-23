import type { PsiResult } from "./types";

const ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

const pct = (v: unknown) => (typeof v === "number" ? Math.round(v * 100) : null);

export async function runPsi(url: string, strategy: "mobile" | "desktop"): Promise<PsiResult> {
  const empty: PsiResult = { strategy, status: "error", performance: null, accessibility: null, bestPractices: null, seo: null, lcpMs: null, cls: null, inpMs: null, errorMessage: null };
  const q = new URLSearchParams({ url, strategy, locale: "ru" });
  for (const c of ["PERFORMANCE", "ACCESSIBILITY", "BEST_PRACTICES", "SEO"]) q.append("category", c);
  if (process.env.PSI_API_KEY) q.set("key", process.env.PSI_API_KEY);
  try {
    const res = await fetch(`${ENDPOINT}?${q}`, { signal: AbortSignal.timeout(120000) });
    const data = await res.json();
    if (!res.ok) return { ...empty, errorMessage: data?.error?.message || `PageSpeed ответил кодом ${res.status}` };
    const lh = data.lighthouseResult;
    const cats = lh?.categories || {};
    const audits = lh?.audits || {};
    return {
      strategy,
      status: "ok",
      performance: pct(cats.performance?.score),
      accessibility: pct(cats.accessibility?.score),
      bestPractices: pct(cats["best-practices"]?.score),
      seo: pct(cats.seo?.score),
      lcpMs: typeof audits["largest-contentful-paint"]?.numericValue === "number" ? Math.round(audits["largest-contentful-paint"].numericValue) : null,
      cls: typeof audits["cumulative-layout-shift"]?.numericValue === "number" ? Math.round(audits["cumulative-layout-shift"].numericValue * 1000) / 1000 : null,
      inpMs: data.loadingExperience?.metrics?.INTERACTION_TO_NEXT_PAINT?.percentile ?? null,
      errorMessage: null,
    };
  } catch (e) {
    return { ...empty, errorMessage: (e as Error).name === "TimeoutError" ? "PageSpeed не ответил вовремя" : "PageSpeed недоступен" };
  }
}
