import { CategoryBars, PlanList, ScaleLegend, ScoreRing, SeverityStrip, vars } from "@/components/report/primitives";
import { PsiPanel } from "@/components/report/PsiPanel";
import { SAMPLE_CATEGORIES, SAMPLE_MODELS, SAMPLE_PLAN, SAMPLE_PSI, SAMPLE_TREND } from "@/lib/sample";

function TrendChart() {
  const { months, score, ai } = SAMPLE_TREND;
  const xs = months.map((_, i) => 60 + i * 96);
  const y = (v: number) => Math.round((20 + (100 - v) * 1.7) * 10) / 10;
  const line = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${xs[i]} ${y(v)}`).join(" ");
  const last = xs.length - 1;
  return (
    <svg viewBox="0 0 560 222" role="img" aria-label={`Балл вырос с ${score[0]} до ${score[last]}, видимость в ИИ с ${ai[0]} до ${ai[last]} процентов`}>
      <defs>
        <linearGradient id="gl" x1="0" x2="1">
          <stop offset="0" stopColor="#4f7bff" />
          <stop offset=".5" stopColor="#8d6bff" />
          <stop offset="1" stopColor="#d57ad6" />
        </linearGradient>
        <linearGradient id="ga" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#8d6bff" stopOpacity=".22" />
          <stop offset="1" stopColor="#8d6bff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g stroke="rgba(20,20,43,.07)">
        {[100, 75, 50, 25, 0].map((v) => (
          <line key={v} x1="40" y1={y(v)} x2="550" y2={y(v)} />
        ))}
      </g>
      <g className="ax" textAnchor="end">
        {[100, 75, 50, 25, 0].map((v) => (
          <text key={v} x="32" y={y(v) + 4}>
            {v}
          </text>
        ))}
      </g>
      <g className="ax" textAnchor="middle">
        {months.map((m, i) => (
          <text key={m} x={xs[i]} y="214">
            {m}
          </text>
        ))}
      </g>
      <path d={`${line(score)} L${xs[last]} 190 L${xs[0]} 190 Z`} fill="url(#ga)" />
      <path className="line" d={line(score)} stroke="url(#gl)" />
      <path className="line" d={line(ai)} stroke="#45d6a6" />
      <circle cx={xs[last]} cy={y(score[last])} r="6" fill="#fff" stroke="#d57ad6" strokeWidth="3" />
      <circle cx={xs[last]} cy={y(ai[last])} r="6" fill="#fff" stroke="#45d6a6" strokeWidth="3" />
      <g fontFamily="Onest, sans-serif" fontWeight="600" fontSize="13" textAnchor="end">
        <text x={xs[last] - 12} y={y(score[last]) - 8} fill="#14142b">
          {score[last]}
        </text>
        <text x={xs[last] - 12} y={y(ai[last]) - 8} fill="#12855c">
          {ai[last]}%
        </text>
      </g>
    </svg>
  );
}

export function DemoDashboard() {
  return (
    <div className="dash-wrap">
      <div className="glow2" aria-hidden="true" />
      <div className="dash glass rise" data-play>
        <aside className="side" aria-hidden="true">
          <i className="on" />
          <i />
          <i />
          <i />
          <i />
        </aside>
        <div className="dmain">
          <div className="dhead">
            <div>
              <h3>Аудит сайта</h3>
              <span className="url">ваш-сайт.ru · пример отчёта</span>
            </div>
            <div className="chipline">
              <span>Поделиться ссылкой</span>
              <span>Скачать отчёт</span>
            </div>
          </div>
          <div className="grid">
            <div className="card c-score">
              <h4>Общий балл</h4>
              <div className="score">
                <ScoreRing score={78} />
                <div className="verdict">
                  <b>Средний результат</b>
                  <span>Сайт в порядке, но 8 важных замечаний мешают расти.</span>
                  <ScaleLegend />
                </div>
              </div>
            </div>
            <div className="card c-sev">
              <h4>Найдено по важности</h4>
              <div className="kpis">
                <div className="kpi">
                  <span>Страниц</span>
                  <b data-count="20">20</b>
                  <em style={{ color: "var(--muted)" }}>проверено</em>
                </div>
                <div className="kpi">
                  <span>Пройдено</span>
                  <b data-count="109">109</b>
                  <em style={{ color: "var(--good)" }}>из 127</em>
                </div>
                <div className="kpi">
                  <span>Важно</span>
                  <b data-count="8">8</b>
                  <em style={{ color: "#a86806" }}>влияет на позиции</em>
                </div>
                <div className="kpi">
                  <span>Советы</span>
                  <b data-count="10">10</b>
                  <em style={{ color: "var(--muted)" }}>не срочно</em>
                </div>
              </div>
              <SeverityStrip critical={0} important={8} advice={10} />
            </div>
            <div className="card c-cats">
              <h4>Профиль по направлениям</h4>
              <CategoryBars categories={SAMPLE_CATEGORIES} />
              <span className="hint">Отметки — пороги 50 и 80: ниже 50 плохо, 50–79 средне, от 80 хорошо.</span>
            </div>
            <div className="card c-trend chart">
              <div className="dhead">
                <h4>Динамика балла и видимости</h4>
                <div className="legend">
                  <span style={vars({ "--c": "#8d6bff" })}>Балл аудита</span>
                  <span style={vars({ "--c": "#45d6a6" })}>Видимость в ИИ, %</span>
                </div>
              </div>
              <TrendChart />
            </div>
            <div className="card c-psi">
              <PsiPanel psi={SAMPLE_PSI} status="ready" />
            </div>
            <div className="card c-ai">
              <h4>Видимость в ответах ИИ</h4>
              <div className="models">
                {SAMPLE_MODELS.map((m) => (
                  <div className="model" key={m.name}>
                    <span>{m.name}</span>
                    <span className="bar">
                      <i className="grow" style={vars({ "--v": Math.round((m.hits / 6) * 100) })} />
                    </span>
                    <b>{m.hits}/6</b>
                  </div>
                ))}
              </div>
              <span className="hint">Сколько ответов из 6 назвали компанию. Вопросы задаются без упоминания бренда.</span>
            </div>
            <div className="card c-plan">
              <div className="dhead">
                <h4>Что сделать в первую очередь</h4>
                <span className="hint">Ещё 15 шагов в полном плане</span>
              </div>
              <PlanList items={SAMPLE_PLAN} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
