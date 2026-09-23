import type { IssueView } from "./audit/report";
import type { CategoryScore, PsiResult } from "./audit/types";

/** Example data for the landing page dashboard. Clearly labelled as an example on the page. */
export const SAMPLE_CATEGORIES: CategoryScore[] = [
  { key: "trust", label: "152-ФЗ", score: 73, passed: 10, failed: 5 },
  { key: "mobile", label: "Мобильность", score: 77, passed: 7, failed: 3 },
  { key: "content", label: "Контент", score: 85, passed: 13, failed: 3 },
  { key: "structure", label: "Структура", score: 85, passed: 12, failed: 2 },
  { key: "ai", label: "ИИ-готовность", score: 86, passed: 7, failed: 1 },
  { key: "markup", label: "Микроразметка", score: 88, passed: 11, failed: 1 },
  { key: "meta", label: "Мета-теги", score: 91, passed: 14, failed: 2 },
  { key: "technical", label: "Техника", score: 98, passed: 19, failed: 1 },
  { key: "indexing", label: "Индексация", score: 100, passed: 16, failed: 0 },
];

export const SAMPLE_PSI: PsiResult[] = [
  { strategy: "mobile", status: "ok", performance: 75, accessibility: 93, bestPractices: 96, seo: 92, lcpMs: 4300, cls: 0, inpMs: null, errorMessage: null },
  { strategy: "desktop", status: "ok", performance: 96, accessibility: 95, bestPractices: 100, seo: 92, lcpMs: 1100, cls: 0, inpMs: null, errorMessage: null },
];

const plan = (checkId: string, action: string, details: string, categoryLabel: string, urls: number): IssueView => ({
  checkId,
  category: "ai",
  categoryLabel,
  severity: "important",
  status: "failed",
  title: action,
  details,
  explain: "",
  recommendation: action,
  action,
  impact: "",
  affectedUrls: Array.from({ length: urls }, (_, i) => `https://example.ru/${i}`),
});

export const SAMPLE_PLAN: IssueView[] = [
  { ...plan("ai-answer-on-top", "Дайте на главной прямой ответ: что делаете, где и от какой цены", "В первых 1500 знаках нет ни цены, ни цифр.", "ИИ-готовность", 1), impact: "Нейросеть возьмёт с сайта конкретику, а не лозунг." },
  { ...plan("title-length-range", "Сократите title до 30–65 символов", "Длинные заголовки обрезаются в выдаче.", "Мета-теги", 8), impact: "Сниппеты станут понятнее, по ним будут чаще кликать." },
  { ...plan("no-fixed-pixel-width-wrapper", "Уберите фиксированные ширины шире экрана телефона", "Блоки шириной 960–1200 пикселей.", "Мобильность", 14), impact: "С телефона сайтом станет удобно пользоваться." },
];

export const SAMPLE_MODELS = [
  { name: "Яндекс Алиса", hits: 4 },
  { name: "ChatGPT", hits: 3 },
  { name: "Perplexity", hits: 2 },
  { name: "GigaChat", hits: 2 },
  { name: "Gemini", hits: 1 },
  { name: "Claude", hits: 0 },
];

export const SAMPLE_TREND = { months: ["Апр", "Май", "Июн", "Июл", "Авг", "Сен"], score: [52, 60, 68, 79, 87, 91], ai: [5, 12, 20, 34, 46, 58] };
