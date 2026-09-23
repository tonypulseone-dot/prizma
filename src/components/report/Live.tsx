"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { AuditStatusPayload } from "@/lib/audit/types";

const STEPS = [
  { key: "open", label: "Открываем сайт", match: /открыва|очеред/i },
  { key: "robots", label: "Читаем robots.txt и карту сайта", match: /robots/i },
  { key: "crawl", label: "Обходим страницы", match: /обход/i },
  { key: "checks", label: "Проверяем ссылки, картинки и 127 параметров", match: /ссылк|картин|провер/i },
  { key: "score", label: "Считаем балл", match: /балл|готово/i },
];

function activeIndex(step: string): number {
  const i = STEPS.findIndex((s) => s.match.test(step));
  return i < 0 ? 0 : i;
}

async function fetchStatus(id: string): Promise<AuditStatusPayload | null> {
  try {
    const res = await fetch(`/api/audit/${id}/status`, { cache: "no-store" });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/** Shown while the audit runs; refreshes the page into the full report once it is done. */
export function ProgressLive({ id, initial, reportUrl }: { id: string; initial: AuditStatusPayload; reportUrl: string }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    if (s.status === "done" || s.status === "failed") return;
    let tries = 0;
    const t = setInterval(async () => {
      if (++tries > 150) {
        setLost(true);
        clearInterval(t);
        return;
      }
      const next = await fetchStatus(id);
      if (!next) return;
      setS(next);
      if (next.status === "done" || next.status === "failed") {
        clearInterval(t);
        router.refresh();
      }
    }, 2000);
    return () => clearInterval(t);
  }, [id, s.status, router]);

  const active = activeIndex(s.progressStep);
  return (
    <div className="progress-card glass">
      <span className="eyebrow">
        <i />
        Проверяем сайт
      </span>
      <h1 className="h2" style={{ fontSize: "clamp(26px,4vw,40px)" }}>
        Обычно это занимает 1–2 минуты
      </h1>
      <p className="lead">Страницу можно не закрывать: отчёт появится здесь сам.</p>
      <div className="progress" role="progressbar" aria-valuenow={s.progressPercent} aria-valuemin={0} aria-valuemax={100}>
        <i style={{ ["--w" as string]: `${Math.max(4, s.progressPercent)}%` }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {STEPS.map((st, i) => (
          <div key={st.key} className={`pstep ${i < active ? "done" : i === active ? "active" : ""}`}>
            <i>{i < active ? "✓" : i + 1}</i>
            <span>
              {st.label}
              {st.key === "crawl" && s.pagesCrawled > 0 ? ` · ${s.pagesCrawled} из ${s.pagesPlanned}` : ""}
            </span>
          </div>
        ))}
      </div>
      {lost && <p className="notice">Не удалось получить статус. Обновите страницу.</p>}
      <div className="permalink">
        <span className="hint">Ссылка на отчёт:</span>
        <code>{reportUrl}</code>
      </div>
    </div>
  );
}

/** Refreshes the finished report once PageSpeed data arrives. */
export function PsiWatcher({ id, pending }: { id: string; pending: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!pending) return;
    let tries = 0;
    const t = setInterval(async () => {
      if (++tries > 60) return clearInterval(t);
      const next = await fetchStatus(id);
      if (next && next.psiStatus !== "pending") {
        clearInterval(t);
        router.refresh();
      }
    }, 3000);
    return () => clearInterval(t);
  }, [id, pending, router]);
  return null;
}

export function CopyLink({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn ghost"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          window.prompt("Скопируйте ссылку", url);
        }
      }}
    >
      {done ? "Ссылка скопирована" : "Скопировать ссылку"}
    </button>
  );
}
