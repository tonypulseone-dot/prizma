import { SEVERITY_LABEL } from "./categories";
import type { ReportView } from "./report";

const esc = (s: string | number | null | undefined) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const fmtDate = (iso: string) => new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" });

export function downloadFileName(v: ReportView): string {
  return `otchet-${v.host.replace(/[^a-z0-9.-]/gi, "_")}-${v.createdAt.slice(0, 10)}.html`;
}

/** Self-contained HTML report: inline styles, no scripts, prints cleanly. */
export function renderReportHtml(v: ReportView, siteUrl: string): string {
  const online = `${siteUrl.replace(/\/$/, "")}/report/${v.id}`;
  const failed = v.issues.filter((i) => i.status === "failed");
  const group = (sev: "critical" | "important" | "advice") => failed.filter((i) => i.severity === sev);
  const psiRows = v.psi
    .filter((p) => p.status === "ok")
    .map((p) => `<tr><td>${p.strategy === "mobile" ? "Телефон" : "Компьютер"}</td><td>${esc(p.performance)}</td><td>${esc(p.accessibility)}</td><td>${esc(p.bestPractices)}</td><td>${esc(p.seo)}</td><td>${p.lcpMs != null ? (p.lcpMs / 1000).toFixed(1) + " с" : "—"}</td><td>${p.cls ?? "—"}</td></tr>`)
    .join("");
  const steps = [
    group("critical").length ? { t: "Закрыть критичные проблемы", d: "Они напрямую мешают сайту попадать в поиск.", items: group("critical") } : null,
    group("important").length ? { t: "Закрыть важные замечания", d: "Влияют на видимость: мета-данные, структура, скорость, машиночитаемость.", items: group("important") } : null,
    group("advice").length ? { t: "Пройти по советам", d: "Необязательные, но полезные улучшения.", items: group("advice") } : null,
    { t: "Проверить сайт повторно", d: "После правок запустите аудит снова: будет видно, что закрылось и как изменился балл.", items: [] },
  ].filter(Boolean) as { t: string; d: string; items: typeof failed }[];

  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Отчёт по сайту ${esc(v.host)} — Призма</title>
<style>
:root{--ink:#14142b;--mid:#5b5b78;--line:#e4e4f0;--violet:#7b5cff;--soft:#f5f3ff;--good:#12855c;--warn:#a86806;--bad:#c42a4b}
*{box-sizing:border-box}body{margin:0;padding:32px 20px 64px;background:#fff;color:var(--ink);font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}
.wrap{max-width:900px;margin:0 auto}h1{font-size:28px;margin:0 0 4px;letter-spacing:-.02em}h2{font-size:20px;margin:36px 0 12px;letter-spacing:-.01em}
.muted{color:var(--mid)}a{color:var(--violet)}
.hero{display:flex;gap:24px;align-items:center;flex-wrap:wrap;margin-top:24px;padding:20px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(135deg,#f3f6ff,#fbf4ff)}
.score{font-size:56px;font-weight:700;letter-spacing:-.04em;line-height:1}.score small{font-size:18px;color:var(--mid);font-weight:500}
.stats{display:flex;gap:18px;flex-wrap:wrap}.stats div{min-width:110px}.stats b{display:block;font-size:22px}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--mid);font-weight:600}
.bar{height:8px;border-radius:4px;background:var(--line);overflow:hidden;min-width:120px}.bar i{display:block;height:100%}
.tag{display:inline-block;font-size:12px;font-weight:600;padding:2px 8px;border-radius:999px}.critical{background:#fde7ec;color:var(--bad)}.important{background:#fdf1dc;color:var(--warn)}.advice{background:var(--soft);color:#5a3fd6}
.item{padding:12px 0;border-bottom:1px solid var(--line)}.item h3{margin:4px 0;font-size:16px}.item p{margin:4px 0}.urls{font-size:13px;color:var(--mid);word-break:break-all}
ol.steps{padding-left:20px}ol.steps li{margin-bottom:12px}ol.steps ul{margin:6px 0 0;padding-left:18px;color:var(--mid)}
pre{white-space:pre-wrap;background:#f7f7fb;border-radius:8px;padding:10px;font-size:13px}
@media print{body{padding:0}.hero{break-inside:avoid}}
</style></head><body><div class="wrap">
<p class="muted">Призма · SEO и GEO аудит</p>
<h1>Отчёт по сайту ${esc(v.url)}</h1>
<p class="muted">Проверка от ${esc(fmtDate(v.createdAt))} (МСК) · онлайн-версия: <a href="${esc(online)}">${esc(online)}</a></p>
<div class="hero"><div class="score">${v.score}<small> из 100</small><div style="font-size:16px;font-weight:600;margin-top:6px">${esc(v.verdict.title)}</div></div>
<div class="stats"><div><b>${v.stats.pages}</b><span class="muted">страниц проверено</span></div><div><b>${v.stats.passed} из ${v.stats.applicable}</b><span class="muted">проверок пройдено</span></div><div><b>${v.stats.critical}</b><span class="muted">критичных</span></div><div><b>${v.stats.important}</b><span class="muted">важных</span></div></div></div>

<h2>По направлениям</h2>
<table><tr><th>Направление</th><th>Балл</th><th></th><th>Пройдено</th></tr>
${v.categories.map((c) => `<tr><td>${esc(c.label)}</td><td><b>${c.score}</b></td><td><div class="bar"><i style="width:${c.score}%;background:${c.score >= 80 ? "#1fb57f" : c.score >= 50 ? "#f2a01c" : "#f0506e"}"></i></div></td><td>${c.passed} из ${c.passed + c.failed}</td></tr>`).join("")}
</table>

<h2>Скорость по Google PageSpeed</h2>
${psiRows ? `<table><tr><th>Устройство</th><th>Производительность</th><th>Доступность</th><th>Практики</th><th>SEO</th><th>LCP</th><th>CLS</th></tr>${psiRows}</table>` : `<p class="muted">Данные PageSpeed не получены.</p>`}

<h2>Ключевые слова и фразы</h2>
<p class="muted">Определены по текстам страниц. Частотность запросов в поиске здесь не измеряется.</p>
<p><b>Слова:</b> ${v.keywords.words.map((w) => esc(w.term)).join(", ") || "—"}</p>
<p><b>Фразы:</b> ${v.keywords.phrases.map((w) => esc(w.term)).join(" · ") || "—"}</p>

<h2>Вывод</h2>
${v.conclusion.map((c) => `<p>${esc(c)}</p>`).join("")}

<h2>Пошаговый план</h2>
<ol class="steps">${steps.map((s) => `<li><b>${esc(s.t)}</b><br><span class="muted">${esc(s.d)}</span>${s.items.length ? `<ul>${s.items.map((i) => `<li>${esc(i.title)}</li>`).join("")}</ul>` : ""}</li>`).join("")}</ol>

<h2>Что сделать — подробно (${failed.length})</h2>
${failed
  .map(
    (i) => `<div class="item"><span class="tag ${i.severity}">${SEVERITY_LABEL[i.severity]}</span> <span class="muted">${esc(i.categoryLabel)}</span>
<h3>${esc(i.title)}</h3><p>${esc(i.details)}</p><p class="muted">${esc(i.explain)}</p><pre>${esc(i.recommendation)}</pre>
${i.affectedUrls.length ? `<p class="urls">${i.affectedUrls.slice(0, 20).map(esc).join("<br>")}${i.affectedUrls.length > 20 ? `<br>и ещё ${i.affectedUrls.length - 20}` : ""}</p>` : ""}</div>`,
  )
  .join("")}

<h2>Проверенные страницы (${v.pages.length})</h2>
<table><tr><th>Адрес</th><th>Замечаний</th><th>Критичных</th></tr>${v.pages.map((p) => `<tr><td style="word-break:break-all">${esc(p.url)}</td><td>${p.issues}</td><td>${p.critical}</td></tr>`).join("")}</table>
<p class="muted" style="margin-top:32px">Балл: критичная проверка весит 5, важная 3, совет 1. Балл направления — доля веса пройденных проверок, общий балл — среднее по направлениям с их весами. Неприменимые проверки не учитываются.</p>
</div></body></html>`;
}
