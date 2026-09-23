"use client";

import { useState } from "react";
import { CATEGORIES, SEVERITY_LABEL } from "@/lib/audit/categories";
import type { IssueView } from "@/lib/audit/report";
import type { CategoryKey, Severity } from "@/lib/audit/types";
import { SEV_TAG } from "./primitives";

const GROUP_HINT: Record<Severity, string> = {
  critical: "Мешает сайту попадать в поиск, чинить в первую очередь",
  important: "Заметно влияет на позиции и переходы из выдачи",
  advice: "Не срочно, но сделает сайт аккуратнее",
};

export function AllChecks({ issues }: { issues: IssueView[] }) {
  const [cat, setCat] = useState<CategoryKey | "all">("all");
  const inCat = issues.filter((i) => cat === "all" || i.category === cat);
  const failed = inCat.filter((i) => i.status === "failed");
  const passed = inCat.filter((i) => i.status === "passed");
  const na = inCat.filter((i) => i.status === "na");

  return (
    <>
      <div className="tabs" role="group" aria-label="Направление">
        <button type="button" aria-pressed={cat === "all"} onClick={() => setCat("all")}>
          Все
        </button>
        {CATEGORIES.map((c) => (
          <button key={c.key} type="button" aria-pressed={cat === c.key} onClick={() => setCat(c.key)}>
            {c.label}
          </button>
        ))}
      </div>

      {(["critical", "important", "advice"] as const).map((sev) => {
        const list = failed.filter((i) => i.severity === sev);
        if (!list.length) return null;
        return (
          <div className="issue-group" key={sev}>
            <h3>
              <span className={`tag ${SEV_TAG[sev]}`}>
                {SEVERITY_LABEL[sev]} {list.length}
              </span>
              <small>{GROUP_HINT[sev]}</small>
            </h3>
            {list.map((i) => (
              <details className="issue" key={i.checkId}>
                <summary>
                  <span className="s">
                    <b>{i.title}</b>
                    <span>{i.details}</span>
                  </span>
                </summary>
                <div className="body">
                  <p>
                    <b>Почему это важно.</b> {i.explain}
                  </p>
                  <div>
                    <b>Что сделать</b>
                    <pre>{i.recommendation}</pre>
                  </div>
                  <p>
                    <b>Что это даст.</b> {i.impact}
                  </p>
                  {i.affectedUrls.length > 0 && (
                    <div>
                      <b>Где найдено ({i.affectedUrls.length})</b>
                      <ul className="urls">
                        {i.affectedUrls.slice(0, 30).map((u) => (
                          <li key={u}>{u}</li>
                        ))}
                        {i.affectedUrls.length > 30 && <li>и ещё {i.affectedUrls.length - 30}</li>}
                      </ul>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        );
      })}
      {!failed.length && <p className="hint">В этом направлении замечаний нет.</p>}

      {passed.length > 0 && (
        <details className="issue">
          <summary>
            <span className="s">
              <b>Пройдено проверок: {passed.length}</b>
              <span>Всё, что на сайте уже в порядке</span>
            </span>
          </summary>
          <div className="body">
            <ul className="passed-list">
              {passed.map((i) => (
                <li key={i.checkId} title={i.details}>
                  {i.title}
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
      {na.length > 0 && <p className="hint">Не применимо к этому сайту и не влияет на балл: {na.length}.</p>}
    </>
  );
}
