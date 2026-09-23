import type { CheckOutcome, PageData, SiteContext } from "../types";

export const pass = (details: string): CheckOutcome => ({ status: "passed", details });
export const fail = (details: string, affectedUrls: string[] = []): CheckOutcome => ({
  status: "failed",
  details,
  affectedUrls: [...new Set(affectedUrls)],
});
export const na = (details: string): CheckOutcome => ({ status: "na", details });

/** Pages that answered 200 with HTML: the only ones page-level checks look at. */
export const okPages = (ctx: SiteContext) => ctx.pages.filter((p) => p.status === 200);

/** Fails when any page matches `bad`, listing those pages. */
export function perPage(
  ctx: SiteContext,
  bad: (p: PageData) => boolean,
  failText: (n: number, total: number) => string,
  passText: string,
  pages: PageData[] = okPages(ctx),
): CheckOutcome {
  if (!pages.length) return na("Нет страниц для проверки.");
  const hits = pages.filter(bad).map((p) => p.url);
  return hits.length ? fail(failText(hits.length, pages.length), hits) : pass(passText);
}

export const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};

export const pagesWord = (n: number) => `${n} ${plural(n, "страница", "страницы", "страниц")}`;

export const header = (h: Record<string, string>, name: string) => h[name.toLowerCase()] ?? "";

export const PRICE_RE = /(?:от\s*)?\d[\d\s ]{0,9}(?:[.,]\d+)?\s?(?:₽|руб\.?|рублей|р\.)/i;
export const TRACKERS = {
  foreign: [
    { re: /googletagmanager\.com|google-analytics\.com|gtag\(/i, name: "Google Analytics / Tag Manager" },
    { re: /connect\.facebook\.net|fbq\(/i, name: "Meta Pixel" },
    { re: /static\.hotjar\.com/i, name: "Hotjar" },
    { re: /clarity\.ms/i, name: "Microsoft Clarity" },
  ],
  local: [
    { re: /mc\.yandex\.ru|ym\(\d+/i, name: "Яндекс Метрика" },
    { re: /top-fwz1\.mail\.ru|top\.mail\.ru/i, name: "Top@Mail.Ru" },
    { re: /vk\.com\/js\/api\/openapi|vk\.com\/rtrg/i, name: "VK Пиксель" },
  ],
};
