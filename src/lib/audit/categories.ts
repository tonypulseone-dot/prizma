import type { CategoryKey } from "./types";

export const CATEGORIES: { key: CategoryKey; label: string; weight: number; impact: string }[] = [
  { key: "technical", label: "Техника", weight: 20, impact: "Сайт будет открываться быстро и без ошибок, а поисковый робот обойдёт его целиком." },
  { key: "meta", label: "Мета-теги", weight: 20, impact: "Сниппеты в выдаче станут понятнее, и по ним будут чаще переходить." },
  { key: "indexing", label: "Индексация", weight: 15, impact: "Нужные страницы попадут в поиск, а лишние и дубли перестанут мешать." },
  { key: "ai", label: "ИИ-готовность", weight: 7.5, impact: "Нейросетям будет проще прочитать сайт и назвать вашу компанию в ответе." },
  { key: "content", label: "Контент", weight: 7.5, impact: "Тексты станут полезнее для людей и понятнее для поиска." },
  { key: "structure", label: "Структура", weight: 7.5, impact: "Людям и роботам станет проще ходить по сайту, важные страницы не потеряются." },
  { key: "markup", label: "Микроразметка", weight: 7.5, impact: "Поиск и соцсети покажут компанию и ссылки на сайт заметнее." },
  { key: "mobile", label: "Мобильность", weight: 7.5, impact: "С телефона сайтом станет удобно пользоваться, а это большая часть посетителей." },
  { key: "trust", label: "Безопасность и 152-ФЗ", weight: 7.5, impact: "Меньше риск штрафа по 152-ФЗ и взлома, больше доверия посетителей." },
];

export const CATEGORY_BY_KEY = Object.fromEntries(CATEGORIES.map((c) => [c.key, c])) as Record<
  CategoryKey,
  (typeof CATEGORIES)[number]
>;

export const SEVERITY_WEIGHT = { critical: 5, important: 3, advice: 1 } as const;
export const SEVERITY_LABEL = { critical: "Критично", important: "Важно", advice: "Совет" } as const;
