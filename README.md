# Призма — SEO + GEO аудит сайта

Лендинг в стиле «жидкое стекло» и рабочий сервис аудита: вводите адрес сайта, через 1–2 минуты получаете отчёт по постоянной ссылке.

## Запуск

```bash
npm install
cp .env.example .env.local   # при необходимости поправьте значения
npm run dev                  # http://localhost:3000
```

Продакшен: `npm run build && npm start`. Нужен Node.js 20.9+.

## Проверки качества

```bash
npm run typecheck   # TypeScript
npm test            # 44 теста: реестр, robots.txt, нормализация URL, аудит тестового сайта
```

Тестовый сайт с заранее заложенными ошибками лежит в `test/fixture-site.ts`. Его можно поднять вручную (`PORT=4555 node test/serve-fixture.ts`) и проверить через интерфейс, если запустить сервер с `AUDIT_ALLOW_PRIVATE_HOSTS=1`.

## Как устроено

| Часть | Где |
|---|---|
| Лендинг | `src/app/page.tsx`, пример дашборда `src/components/landing/DemoDashboard.tsx` |
| Страница отчёта | `src/app/report/[id]/page.tsx`, компоненты `src/components/report/*` |
| API | `POST /api/audit` (форма или JSON `{url}` → 303 на `/report/{id}`), `GET /api/audit/{id}/status`, `GET /api/report/{id}/download` |
| Движок | `src/lib/audit/`: `crawl.ts` (обход до 20 страниц, robots, sitemap, пробы домена), `parse.ts`, `checks/*` (127 проверок в 9 направлениях), `score.ts`, `keywords.ts`, `psi.ts` (Google PageSpeed), `run.ts` (очередь и статусы) |
| Хранилище | `src/lib/store.ts`: JSON-файлы в `.data/audits` + кэш в памяти. Для масштабирования заменить на Postgres |

Формула балла: вес проверки — критичная 5, важная 3, совет 1. Балл направления — доля веса пройденных среди применимых. Общий балл — средневзвешенное направлений (Техника 20, Мета-теги 20, Индексация 15, остальные по 7,5).

Защита: SSRF-фильтр (не ходим во внутренние сети), лимит 10 проверок в час с одного IP, заголовки безопасности в `next.config.ts`.

Выкладка на сервер: [DEPLOY.md](DEPLOY.md). ТЗ и разбор исходного сервиса: [docs/seo-audit-clone-spec.md](docs/seo-audit-clone-spec.md), утверждённый макет: [docs/landing-draft.html](docs/landing-draft.html).

## Что ещё не сделано

- GEO-замер видимости в нейросетях (нужны ключи API моделей) — на лендинге пока описание и пример.
- Регистрация, кабинет, оплата тарифов, реферальная программа.
- Блог, оферта и политика ПДн (ссылки в подвале пока без страниц).
- Очередь задач сейчас в процессе Node; для нескольких серверов — вынести в воркер (BullMQ/Redis).
