import { CATEGORIES, SEVERITY_WEIGHT } from "./categories";
import { CHECK_BY_ID } from "./checks";
import type { CategoryScore, CheckResult, PageSummary } from "./types";

/**
 * Category score = share of passed weight among applicable checks (critical 5, important 3, advice 1).
 * Overall score = weighted mean of category scores; categories with nothing applicable are skipped.
 */
export function scoreResults(results: CheckResult[]): { score: number; categories: CategoryScore[] } {
  const categories: CategoryScore[] = [];
  let weighted = 0;
  let weights = 0;
  for (const cat of CATEGORIES) {
    let passedW = 0;
    let totalW = 0;
    let passed = 0;
    let failed = 0;
    for (const r of results) {
      const def = CHECK_BY_ID.get(r.checkId);
      if (!def || def.category !== cat.key || r.status === "na") continue;
      const w = SEVERITY_WEIGHT[def.severity];
      totalW += w;
      if (r.status === "passed") {
        passedW += w;
        passed++;
      } else failed++;
    }
    if (!totalW) continue;
    const score = Math.round((100 * passedW) / totalW);
    categories.push({ key: cat.key, label: cat.label, score, passed, failed });
    weighted += score * cat.weight;
    weights += cat.weight;
  }
  return { score: weights ? Math.round(weighted / weights) : 0, categories };
}

/** Issues per page: only checks that pointed at a specific address count. */
export function summarizePages(results: CheckResult[], pageUrls: string[]): PageSummary[] {
  const byPage = new Map(pageUrls.map((u) => [u, { url: u, issues: 0, critical: 0 }]));
  for (const r of results) {
    if (r.status !== "failed") continue;
    const def = CHECK_BY_ID.get(r.checkId);
    for (const url of new Set(r.affectedUrls || [])) {
      const row = byPage.get(url);
      if (!row) continue;
      row.issues++;
      if (def?.severity === "critical") row.critical++;
    }
  }
  return [...byPage.values()].sort((a, b) => b.critical - a.critical || b.issues - a.issues);
}
