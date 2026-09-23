import { CATEGORY_BY_KEY, SEVERITY_WEIGHT } from "./categories";
import { CHECK_BY_ID, CHECK_COUNT } from "./checks";
import type { AuditRecord, CategoryKey, CategoryScore, KeywordTerm, PageSummary, PsiResult, Severity } from "./types";

export interface IssueView {
  checkId: string;
  category: CategoryKey;
  categoryLabel: string;
  severity: Severity;
  status: "passed" | "failed" | "na";
  title: string;
  details: string;
  explain: string;
  recommendation: string;
  /** First sentence of the recommendation: the headline of a plan step. */
  action: string;
  impact: string;
  affectedUrls: string[];
}

export interface ReportView {
  id: string;
  url: string;
  host: string;
  createdAt: string;
  score: number;
  verdict: { title: string; text: string; tone: "good" | "warn" | "bad" };
  stats: { pages: number; applicable: number; passed: number; failed: number; critical: number; important: number; advice: number; checkCount: number };
  plan: IssueView[];
  issues: IssueView[];
  categories: CategoryScore[];
  pages: PageSummary[];
  keywords: { words: KeywordTerm[]; phrases: KeywordTerm[] };
  psi: PsiResult[];
  psiStatus: AuditRecord["psiStatus"];
  conclusion: string[];
}

const SEV_ORDER: Severity[] = ["critical", "important", "advice"];

function firstSentence(text: string, fallback: string): string {
  const t = text.trim();
  if (!t) return fallback;
  const i = t.search(/[.!?](\s|$)/);
  return (i > 0 ? t.slice(0, i + 1) : t).split("\n")[0].trim();
}

export function verdictFor(score: number): ReportView["verdict"] {
  if (score >= 80) return { title: "Хороший результат", text: "Техническая база в порядке. Закройте точечные замечания, чтобы не терять позиции.", tone: "good" };
  if (score >= 50) return { title: "Средний результат", text: "Сайт работает, но заметные проблемы мешают расти в поиске и в ответах ИИ.", tone: "warn" };
  return { title: "Слабый результат", text: "Есть ошибки, из-за которых сайт теряет посетителей и заявки. Начните с критичных.", tone: "bad" };
}

export function buildReportView(rec: AuditRecord): ReportView {
  const issues: IssueView[] = rec.results
    .map((r) => {
      const def = CHECK_BY_ID.get(r.checkId);
      if (!def) return null;
      return {
        checkId: r.checkId,
        category: def.category,
        categoryLabel: CATEGORY_BY_KEY[def.category].label,
        severity: def.severity,
        status: r.status,
        title: def.title,
        details: r.details,
        explain: def.explain,
        recommendation: def.recommendation,
        action: firstSentence(def.recommendation, def.title),
        impact: def.impact || CATEGORY_BY_KEY[def.category].impact,
        affectedUrls: r.affectedUrls || [],
      } satisfies IssueView;
    })
    .filter((x): x is IssueView => !!x);

  const failed = issues.filter((i) => i.status === "failed");
  const catWeight = (k: CategoryKey) => CATEGORY_BY_KEY[k].weight;
  const plan = [...failed]
    .sort(
      (a, b) =>
        SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity] ||
        catWeight(b.category) - catWeight(a.category) ||
        b.affectedUrls.length - a.affectedUrls.length,
    )
    .slice(0, 12);

  const count = (s: Severity) => failed.filter((i) => i.severity === s).length;
  const applicable = issues.filter((i) => i.status !== "na");
  const score = rec.score ?? 0;
  const weakest = [...rec.categories].sort((a, b) => a.score - b.score).slice(0, 3);

  const conclusion = [
    `Сайт набрал ${score} из 100. ${verdictFor(score).text}`,
    count("critical") ? `Критичных проблем: ${count("critical")}. Начните с них: они напрямую мешают сайту попадать в поиск.` : "Критичных проблем не найдено: блокирующих ошибок нет.",
    `Важных замечаний: ${count("important")}, советов: ${count("advice")}. Важные влияют на видимость напрямую, советы — на удобство и запас прочности.`,
    weakest.length ? `Самые слабые направления: ${weakest.map((c) => `${c.label} (${c.score})`).join(", ")}.` : "",
    `Проверено страниц: ${rec.pagesCrawled}. После правок запустите проверку снова и сравните балл.`,
  ].filter(Boolean);

  return {
    id: rec.id,
    url: rec.url,
    host: rec.host,
    createdAt: rec.createdAt,
    score,
    verdict: verdictFor(score),
    stats: {
      pages: rec.pagesCrawled,
      applicable: applicable.length,
      passed: applicable.filter((i) => i.status === "passed").length,
      failed: failed.length,
      critical: count("critical"),
      important: count("important"),
      advice: count("advice"),
      checkCount: CHECK_COUNT,
    },
    plan,
    issues: issues.sort((a, b) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity)),
    categories: [...rec.categories].sort((a, b) => a.score - b.score),
    pages: rec.pages,
    keywords: rec.keywords,
    psi: rec.psi,
    psiStatus: rec.psiStatus,
    conclusion,
  };
}
