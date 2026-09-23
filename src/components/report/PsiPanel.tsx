"use client";

import { useState } from "react";
import type { PsiResult, PsiStatus } from "@/lib/audit/types";
import { vars } from "./primitives";

const ringColor = (v: number | null) => (v == null ? "var(--hair)" : v >= 90 ? "var(--good)" : v >= 50 ? "var(--warn)" : "var(--bad)");

function rate(value: number | null, good: number, poor: number): { cls: string; label: string } {
  if (value == null) return { cls: "none", label: "нет данных" };
  if (value <= good) return { cls: "good", label: "Хорошо" };
  if (value <= poor) return { cls: "warn", label: "Средне" };
  return { cls: "bad", label: "Плохо" };
}

export function PsiPanel({ psi, status, title = "Скорость по Google PageSpeed" }: { psi: PsiResult[]; status: PsiStatus; title?: string }) {
  const available = psi.filter((p) => p.status === "ok");
  const [strategy, setStrategy] = useState<"mobile" | "desktop">(available[0]?.strategy ?? "mobile");
  const cur = available.find((p) => p.strategy === strategy) ?? available[0];

  return (
    <>
      <div className="dhead">
        <h4>{title}</h4>
        {available.length > 1 && (
          <div className="seg" role="group" aria-label="Устройство">
            {(["mobile", "desktop"] as const).map((s) => (
              <button key={s} type="button" aria-pressed={strategy === s} onClick={() => setStrategy(s)}>
                {s === "mobile" ? "Телефон" : "Компьютер"}
              </button>
            ))}
          </div>
        )}
      </div>
      {status === "pending" && <p className="hint">Google PageSpeed считает скорость, обычно это 20–60 секунд. Блок обновится сам.</p>}
      {status !== "pending" && !cur && <p className="hint">PageSpeed не ответил. Скорость не входит в общий балл, остальной отчёт полный.</p>}
      {cur && (
        <>
          <div className="psi" key={cur.strategy}>
            {(
              [
                ["Производительность", cur.performance],
                ["Доступность", cur.accessibility],
                ["Практики", cur.bestPractices],
                ["SEO", cur.seo],
              ] as const
            ).map(([label, v]) => (
              <figure key={label}>
                <div className="pr" style={vars({ "--p": v ?? 0, "--c": ringColor(v) })} role="img" aria-label={`${label}: ${v ?? "нет данных"}`}>
                  <b>{v ?? "—"}</b>
                </div>
                {label}
              </figure>
            ))}
          </div>
          <div className="cwv">
            {(() => {
              const lcp = rate(cur.lcpMs, 2500, 4000);
              const cls = rate(cur.cls, 0.1, 0.25);
              const inp = rate(cur.inpMs, 200, 500);
              return (
                <>
                  <div>
                    LCP<b>{cur.lcpMs != null ? `${(cur.lcpMs / 1000).toFixed(1).replace(".", ",")} с` : "—"}</b>
                    <span className={`tag ${lcp.cls}`}>{lcp.label}</span>
                    <small>норма до 2,5 с</small>
                  </div>
                  <div>
                    CLS<b>{cur.cls != null ? cur.cls.toFixed(2).replace(".", ",") : "—"}</b>
                    <span className={`tag ${cls.cls}`}>{cls.label}</span>
                    <small>норма до 0,1</small>
                  </div>
                  <div>
                    INP<b>{cur.inpMs != null ? `${cur.inpMs} мс` : "—"}</b>
                    <span className={`tag ${inp.cls}`}>{inp.label}</span>
                    <small>норма до 200 мс</small>
                  </div>
                </>
              );
            })()}
          </div>
          <p className="hint">Данные Google Lighthouse. Скорость не входит в общий балл.</p>
        </>
      )}
    </>
  );
}
