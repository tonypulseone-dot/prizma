import type { ReportView } from "@/lib/audit/report";
import { AllChecks } from "./AllChecks";
import { CopyLink, PsiWatcher } from "./Live";
import { CategoryBars, KeywordChips, PagesTable, PlanList, ScaleLegend, ScoreRing, SeverityStrip } from "./primitives";
import { PsiPanel } from "./PsiPanel";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" });

export function ReportBody({ view: v, reportUrl }: { view: ReportView; reportUrl: string }) {
  const toc = [
    ["score", "Общий балл", ""],
    ["plan", "Что сделать", String(v.plan.length)],
    ["severity", "По важности", String(v.stats.failed)],
    ["categories", "По направлениям", "9"],
    ["pages", "По страницам", String(v.pages.length)],
    ["speed", "Скорость", ""],
    ["keywords", "Ключевые слова", ""],
    ["geo", "Видимость в ИИ", ""],
    ["checks", "Все проверки", String(v.stats.checkCount)],
  ];

  return (
    <div className="report">
      <nav className="toc glass" aria-label="Разделы отчёта">
        <b>Разделы отчёта</b>
        {toc.map(([id, label, n]) => (
          <a key={id} href={`#${id}`}>
            {label}
            {n && <small>{n}</small>}
          </a>
        ))}
      </nav>

      <div className="rcol">
        <header className="rhead">
          <span className="hint">Аудит сайта</span>
          <h1>{v.url}</h1>
          <p>Проверка от {fmt(v.createdAt)} (МСК)</p>
        </header>

        <section className="rcard glass" id="score" data-play>
          <div className="summary">
            <ScoreRing score={v.score} size="xl" />
            <div className="verdict">
              <b>{v.verdict.title}</b>
              <span>{v.verdict.text}</span>
              <ScaleLegend />
              <div className="kpis" style={{ marginTop: 16 }}>
                <div className="kpi">
                  <span>Страниц</span>
                  <b data-count={v.stats.pages}>{v.stats.pages}</b>
                  <em style={{ color: "var(--muted)" }}>проверено</em>
                </div>
                <div className="kpi">
                  <span>Пройдено</span>
                  <b data-count={v.stats.passed}>{v.stats.passed}</b>
                  <em style={{ color: "var(--good)" }}>из {v.stats.applicable}</em>
                </div>
                <div className="kpi">
                  <span>Критично</span>
                  <b data-count={v.stats.critical}>{v.stats.critical}</b>
                  <em style={{ color: v.stats.critical ? "#c42a4b" : "var(--muted)" }}>{v.stats.critical ? "чинить сразу" : "нет"}</em>
                </div>
                <div className="kpi">
                  <span>Важно</span>
                  <b data-count={v.stats.important}>{v.stats.important}</b>
                  <em style={{ color: "#a86806" }}>влияет на позиции</em>
                </div>
              </div>
              <div className="row">
                <a className="btn dark" href={`/api/report/${v.id}/download`} download>
                  Скачать отчёт
                </a>
                <CopyLink url={reportUrl} />
              </div>
            </div>
          </div>
        </section>

        <section className="rcard glass" id="plan">
          <h2>{v.plan.length ? "Что сделать" : "Критичных проблем нет"}</h2>
          <p className="hint">
            {v.plan.length ? "Конкретные шаги по итогам проверки. Первые пункты дают больше всего пользы." : "Все проверки пройдены. Держите сайт в этом состоянии и проверяйте после крупных правок."}
          </p>
          <PlanList items={v.plan} />
          {v.stats.failed > v.plan.length && (
            <p className="hint">
              Показано главное. Ещё {v.stats.failed - v.plan.length} замечаний в <a href="#checks">полном списке проверок</a>.
            </p>
          )}
        </section>

        <section className="rcard glass" id="severity" data-play>
          <h2>Найденные проблемы по важности</h2>
          <p className="hint">Всего замечаний: {v.stats.failed}. Полоса показывает, из чего они складываются.</p>
          <SeverityStrip critical={v.stats.critical} important={v.stats.important} advice={v.stats.advice} />
        </section>

        <section className="rcard glass" id="categories" data-play>
          <h2>Профиль по направлениям</h2>
          <p className="hint">Балл каждого направления от 0 до 100. Сверху самые слабые, с них и стоит начинать.</p>
          <CategoryBars categories={v.categories} showCounts />
          <p className="hint">Отметки на полосе — пороги 50 и 80: ниже 50 плохо, 50–79 средне, от 80 хорошо.</p>
        </section>

        <section className="rcard glass" id="pages">
          <h2>Что нашли на каждой странице</h2>
          <p className="hint">Проверено страниц: {v.pages.length}. Сайтовые находки (robots.txt, карта сайта, заголовки сервера) сюда не попадают, они в списке проверок.</p>
          <PagesTable pages={v.pages} />
        </section>

        <section className="rcard glass" id="speed" data-play>
          <PsiPanel psi={v.psi} status={v.psiStatus} />
          <PsiWatcher id={v.id} pending={v.psiStatus === "pending"} />
        </section>

        <section className="rcard glass" id="keywords">
          <h2>Ключевые слова и фразы</h2>
          <p className="hint">Определены по текстам страниц: заголовки весят больше основного текста. Это то, о чём сайт на самом деле рассказывает поиску и нейросетям.</p>
          <h4>Слова</h4>
          <KeywordChips terms={v.keywords.words} />
          <h4>Фразы</h4>
          <KeywordChips terms={v.keywords.phrases} />
          <p className="hint">Если важной услуги нет в списке, на сайте о ней написано мало, и ни поиск, ни ИИ не узнают, что вы ею занимаетесь.</p>
        </section>

        <section className="rcard glass" id="geo">
          <h2>Видимость в ответах ИИ</h2>
          <p>
            Здесь проверено, сможет ли нейросеть прочитать сайт. Называет ли она вашу компанию покупателю, показывает отдельный замер: задаём ИИ вопросы
            клиента без подсказки бренда и сохраняем каждый ответ целиком.
          </p>
          <a className="btn dark" href="/#geo" style={{ alignSelf: "flex-start" }}>
            Проверить видимость в ИИ
          </a>
        </section>

        <section className="rcard glass" id="checks">
          <h2>Все проверки</h2>
          <AllChecks issues={v.issues} />
        </section>

        <section className="rcard glass">
          <h2>Вывод</h2>
          {v.conclusion.map((c) => (
            <p key={c}>{c}</p>
          ))}
          <details className="issue">
            <summary>
              <span className="s">
                <b>Как считается балл</b>
              </span>
            </summary>
            <div className="body">
              <p>
                Каждая проверка имеет вес: критичная — 5, важная — 3, совет — 1. Балл направления — доля веса пройденных проверок среди применимых. Общий балл —
                среднее по направлениям с весами: Техника и Мета-теги по 20, Индексация 15, остальные шесть направлений по 7,5.
              </p>
              <p>Проверки, которые к сайту неприменимы, в расчёт не идут. Быстрее всего балл растёт, если закрывать критичные и важные пункты.</p>
            </div>
          </details>
          <div className="permalink">
            <span className="hint">Постоянная ссылка:</span>
            <code>{reportUrl}</code>
          </div>
        </section>
      </div>
    </div>
  );
}
