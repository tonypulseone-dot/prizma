"use client";

import { useEffect, useState } from "react";

/** Plain HTML form posting to /api/audit, so it works even before JavaScript loads. */
export function AuditForm({ id, button = "Проверить бесплатно", showQueryError = false }: { id: string; button?: string; showQueryError?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The API redirects back with ?error=… when the address is invalid; the page itself stays static.
  useEffect(() => {
    if (showQueryError) setError(new URLSearchParams(window.location.search).get("error"));
    const reset = () => setBusy(false); // back button restores the page from cache
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, [showQueryError]);
  return (
    <>
      <div className="field">
        <form action="/api/audit" method="post" onSubmit={() => setBusy(true)}>
          <input type="hidden" name="returnTo" value="/" />
          <label htmlFor={id} className="sr-only">
            Адрес сайта
          </label>
          <input id={id} name="url" type="text" inputMode="url" autoComplete="url" required placeholder="ваш-сайт.ru" aria-describedby={error ? `${id}-err` : undefined} />
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Запускаем…" : button}
          </button>
        </form>
      </div>
      {error && (
        <p className="form-error" id={`${id}-err`} role="alert">
          {error}
        </p>
      )}
    </>
  );
}
