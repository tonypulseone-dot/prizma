import { randomUUID } from "node:crypto";
import { getAudit, patchAudit, saveAudit } from "../store";
import { runChecks } from "./checks";
import { AuditError, buildContext } from "./crawl";
import { limiter } from "./http";
import { extractKeywords } from "./keywords";
import { runPsi } from "./psi";
import { scoreResults, summarizePages } from "./score";
import type { AuditRecord, AuditStatusPayload } from "./types";
import { InputError } from "./url";

const maxPages = () => Math.max(1, Math.min(200, Number(process.env.AUDIT_MAX_PAGES) || 20));

// Audits run inside this Node process. On serverless hosting move runAudit to a worker (BullMQ, etc.).
const queue = limiter(Number(process.env.AUDIT_CONCURRENCY) || 2);

export function toStatus(rec: AuditRecord): AuditStatusPayload {
  const { status, psiStatus, progressStep, progressPercent, pagesCrawled, pagesPlanned, score, errorMessage } = rec;
  return { status, psiStatus, progressStep, progressPercent, pagesCrawled, pagesPlanned, score, errorMessage };
}

export async function createAudit(url: string): Promise<AuditRecord> {
  const rec: AuditRecord = {
    id: randomUUID(),
    url,
    host: new URL(url).hostname,
    createdAt: new Date().toISOString(),
    status: "pending",
    psiStatus: "pending",
    progressStep: "В очереди",
    progressPercent: 0,
    pagesCrawled: 0,
    pagesPlanned: maxPages(),
    score: null,
    errorMessage: null,
    results: [],
    categories: [],
    pages: [],
    keywords: { words: [], phrases: [] },
    psi: [],
  };
  await saveAudit(rec);
  queue(() => runAudit(rec.id)).catch((e) => console.error("audit crashed", rec.id, e));
  return rec;
}

export async function runAudit(id: string): Promise<void> {
  const rec = await getAudit(id);
  if (!rec) return;
  try {
    await patchAudit(id, { status: "running", progressStep: "Открываем сайт", progressPercent: 1 });
    const ctx = await buildContext(
      rec.url,
      (p) => patchAudit(id, { progressStep: p.step, progressPercent: p.percent, pagesCrawled: p.pagesCrawled, pagesPlanned: p.pagesPlanned }, 400).then(() => {}),
      maxPages(),
    );
    await patchAudit(id, { progressStep: "Проверки", progressPercent: 86, host: ctx.host, url: ctx.home.url });
    const results = runChecks(ctx);
    await patchAudit(id, { progressStep: "Считаем балл", progressPercent: 95 });
    const { score, categories } = scoreResults(results);
    await patchAudit(id, {
      status: "done",
      progressStep: "Готово",
      progressPercent: 100,
      pagesCrawled: ctx.pages.length,
      pagesPlanned: ctx.pages.length,
      score,
      categories,
      results,
      pages: summarizePages(results, ctx.pages.map((p) => p.url)),
      keywords: extractKeywords(ctx.pages),
    });
    void runPageSpeed(id, ctx.home.url);
  } catch (e) {
    const known = e instanceof AuditError || e instanceof InputError;
    if (!known) console.error("audit failed", id, e);
    await patchAudit(id, {
      status: "failed",
      psiStatus: "failed",
      progressStep: "Ошибка",
      errorMessage: known ? (e as Error).message : "Не удалось проверить сайт. Попробуйте ещё раз через пару минут.",
    });
  }
}

async function runPageSpeed(id: string, url: string): Promise<void> {
  if (process.env.PSI_DISABLED === "1") {
    await patchAudit(id, { psiStatus: "failed", psi: [] });
    return;
  }
  const psi = await Promise.all([runPsi(url, "mobile"), runPsi(url, "desktop")]);
  await patchAudit(id, { psi, psiStatus: psi.some((p) => p.status === "ok") ? "ready" : "failed" });
}
