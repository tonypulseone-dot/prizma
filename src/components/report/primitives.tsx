import type { CSSProperties } from "react";
import { SEVERITY_LABEL } from "@/lib/audit/categories";
import type { IssueView } from "@/lib/audit/report";
import type { CategoryScore, KeywordTerm, PageSummary, Severity } from "@/lib/audit/types";

export const vars = (v: Record<string, string | number>) => v as CSSProperties;

export const toneOf = (score: number) => (score >= 80 ? "good" : score >= 50 ? "warn" : "bad");
export const toneColor = (score: number) => `var(--${toneOf(score)})`;
export const SEV_TAG: Record<Severity, string> = { critical: "bad", important: "warn", advice: "soft" };

export function ScoreRing({ score, size = "md" }: { score: number; size?: "md" | "xl" }) {
  return (
    <div className={`big-ring ${size === "xl" ? "xl" : ""}`} style={vars({ "--p": score })} role="img" aria-label={`Балл ${score} из 100`}>
      <div>
        <b data-count={score}>{score}</b>
        <small>из 100</small>
      </div>
    </div>
  );
}

export function ScaleLegend() {
  return (
    <div className="scale" aria-hidden="true">
      <i style={{ width: "49%", background: "var(--bad)", opacity: 0.6 }} />
      <i style={{ width: "30%", background: "var(--warn)", opacity: 0.7 }} />
      <i style={{ width: "21%", background: "var(--good)", opacity: 0.7 }} />
    </div>
  );
}

export function SeverityStrip({ critical, important, advice }: { critical: number; important: number; advice: number }) {
  const total = critical + important + advice;
  const w = (n: number) => `${total ? (n / total) * 100 : 0}%`;
  return (
    <>
      <div className="stack" role="img" aria-label={`Критично ${critical}, важно ${important}, советов ${advice}`}>
        <i className="grow" style={{ width: w(critical), background: "var(--bad)" }} />
        <i className="grow" style={{ width: w(important), background: "var(--warn)" }} />
        <i className="grow" style={{ width: w(advice), background: "#b9a8ff" }} />
      </div>
      <div className="legend">
        <span style={vars({ "--c": "var(--bad)" })}>Критично {critical}</span>
        <span style={vars({ "--c": "var(--warn)" })}>Важно {important}</span>
        <span style={vars({ "--c": "#b9a8ff" })}>Совет {advice}</span>
      </div>
    </>
  );
}

export function CategoryBars({ categories, showCounts = false }: { categories: CategoryScore[]; showCounts?: boolean }) {
  return (
    <div className="cats">
      {categories.map((c) => (
        <div className="cat" key={c.key}>
          <span>
            {c.label}
            {showCounts && <small>Пройдено {c.passed} из {c.passed + c.failed}</small>}
          </span>
          <span className="bar">
            <i className="grow" style={vars({ "--v": c.score, "--c": toneColor(c.score) })} />
          </span>
          <b>{c.score}</b>
        </div>
      ))}
    </div>
  );
}

export function PlanList({ items }: { items: IssueView[] }) {
  return (
    <ol className="plan">
      {items.map((i, n) => (
        <li key={i.checkId}>
          <span className="n">{n + 1}</span>
          <span className="t">
            <b>{i.action}</b>
            <span>{i.affectedUrls.length > 1 ? `Затронуто страниц: ${i.affectedUrls.length}` : i.details}</span>
            <span>
              <b>Что это даст:</b> {i.impact}
            </span>
          </span>
          <span className="meta">
            <span className={`tag ${SEV_TAG[i.severity]}`}>{SEVERITY_LABEL[i.severity]}</span>
            <span className="tag none">{i.categoryLabel}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function KeywordChips({ terms }: { terms: KeywordTerm[] }) {
  if (!terms.length) return <p className="hint">Не нашлось.</p>;
  return (
    <div className="kw">
      {terms.map((t, i) => (
        <span key={t.term} className={i < 3 ? "top" : undefined}>
          {t.term}
        </span>
      ))}
    </div>
  );
}

const shorten = (url: string) => {
  try {
    const u = new URL(url);
    const path = decodeURI(u.pathname + u.search);
    return u.host + (path.length > 60 ? path.slice(0, 24) + "…" + path.slice(-30) : path);
  } catch {
    return url;
  }
};

export function PagesTable({ pages }: { pages: PageSummary[] }) {
  return (
    <div className="pages-table">
      <table>
        <thead>
          <tr>
            <th>Адрес страницы</th>
            <th style={{ textAlign: "right" }}>Замечаний</th>
            <th style={{ textAlign: "right" }}>Критичных</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((p) => (
            <tr key={p.url}>
              <td className="u" title={p.url}>
                <a href={p.url} target="_blank" rel="noopener nofollow">
                  {shorten(p.url)}
                </a>
              </td>
              <td className="n">{p.issues}</td>
              <td className="n" style={{ color: p.critical ? "var(--bad)" : undefined }}>
                {p.critical}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
