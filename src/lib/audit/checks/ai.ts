import { AI_BOTS, isAllowed } from "../robots";
import type { CheckDef } from "../types";
import { fail, header, okPages, pass, PRICE_RE } from "./util";

const CONTENT_TYPES = ["FAQPage", "Product", "Service", "Offer", "AggregateOffer", "HowTo", "Course", "Event", "Menu"];

export const aiChecks: CheckDef[] = [
  {
    id: "ai-bots-allowed",
    category: "ai",
    severity: "critical",
    title: "Сайт открыт для AI-ботов",
    explain: "Если бот нейросети не может зайти на сайт, она физически не сможет его процитировать.",
    recommendation:
      "Разрешите AI-ботов в robots.txt. Вставьте в конец файла блок:\n\n" +
      AI_BOTS.map((b) => `User-agent: ${b}\nAllow: /`).join("\n\n"),
    impact: "ChatGPT, Perplexity, Алиса и другие ассистенты смогут читать сайт и называть вас в ответах.",
    run: (ctx) => {
      const blocked = AI_BOTS.filter((b) => !isAllowed(ctx.robots, b, "/"));
      return blocked.length
        ? fail(`Закрыты для AI-ботов: ${blocked.join(", ")}.`, [new URL("/robots.txt", ctx.origin).toString()])
        : pass(`Все ${AI_BOTS.length} AI-ботов допущены на сайт.`);
    },
  },
  {
    id: "ai-content-without-js",
    category: "ai",
    severity: "important",
    title: "Текст виден без JavaScript",
    explain: "Большинство AI-ботов не выполняют скрипты и читают исходный HTML. Если текст дорисовывает скрипт, для них страница пустая.",
    recommendation: "Отдавайте основной текст сразу в HTML: серверный рендеринг или статические страницы.",
    run: (ctx) => {
      const h = ctx.home;
      const shell = /<div[^>]+id=["'](root|app|__next|__nuxt)["'][^>]*>\s*<\/div>/i.test(h.html);
      if (h.words < 60 && (shell || h.scripts.length >= 3 || h.inlineScriptsBytes > 20000)) {
        return fail(`В исходном HTML главной всего ${h.words} слов, остальное дорисовывает JavaScript.`, [h.url]);
      }
      return pass(`В исходном HTML главной ${h.words} слов текста.`);
    },
  },
  {
    id: "ai-jsonld-content-types",
    category: "ai",
    severity: "important",
    title: "Есть разметка услуг, товаров или FAQ",
    explain: "FAQPage, Product и Service в JSON-LD прямо говорят машине, что вы продаёте и по какой цене.",
    recommendation: "Добавьте JSON-LD типов FAQPage, Service или Product с ценами. Разметку организации проверяем отдельно.",
    run: (ctx) => {
      const found = [...new Set(okPages(ctx).flatMap((p) => p.jsonld.flatMap((b) => b.types)).filter((t) => CONTENT_TYPES.includes(t)))];
      return found.length ? pass(`Найдена разметка: ${found.join(", ")}.`) : fail("Разметки FAQPage, Service или Product нет ни на одной странице.", [ctx.home.url]);
    },
  },
  {
    id: "ai-machine-structure",
    category: "ai",
    severity: "important",
    title: "Есть списки или таблицы фактов",
    explain: "Списки, таблицы и пары «вопрос — ответ» нейросеть забирает в ответ целиком. Сплошной текст цитируется хуже.",
    recommendation: "Добавьте на ключевые страницы список или таблицу «услуга — цена — срок — что входит».",
    run: (ctx) => {
      const has = okPages(ctx).filter((p) => {
        const $ = p.$;
        const root = $("main").length ? $("main") : $("body");
        const lists = root.find("ul, ol").toArray().filter((el) => !$(el).closest("nav, header, footer").length && $(el).children("li").length >= 3);
        return lists.length > 0 || root.find("table").length > 0 || root.find("dl").length > 0;
      });
      return has.length ? pass(`Списки или таблицы есть на ${has.length} страницах.`) : fail("В содержании страниц нет ни списков, ни таблиц.", [ctx.home.url]);
    },
  },
  {
    id: "ai-answer-on-top",
    category: "ai",
    severity: "important",
    title: "Прямой ответ в начале главной",
    explain: "Нейросеть читает ограниченный кусок с верха страницы. Если там нет конкретики, в ответ попадёт пустой слоган.",
    recommendation: "Дайте в первых 1500 знаках главной прямой ответ: что делаете, для кого, где, от какой цены и за какой срок.",
    impact: "Ассистент возьмёт с вашей страницы конкретику, а не лозунг.",
    run: (ctx) => {
      const top = ctx.home.topText;
      const numbers = (top.match(/\d+/g) || []).length;
      return PRICE_RE.test(top) || numbers >= 3
        ? pass("В начале главной есть цены или конкретные цифры.")
        : fail("В первых 1500 знаках главной нет ни цены, ни конкретных цифр.", [ctx.home.url]);
    },
  },
  {
    id: "ai-prices-in-text",
    category: "ai",
    severity: "important",
    title: "Цены написаны текстом",
    explain: "Цену картинкой или в калькуляторе нейросеть не видит, и в ответ попадают конкуренты с ценой словами.",
    recommendation: "Напишите цены прямо в тексте ключевых страниц: «от 45 ₽ за м²», «от 1 200 ₽ за выезд».",
    run: (ctx) => {
      const withPrice = okPages(ctx).filter((p) => PRICE_RE.test(p.text));
      return withPrice.length ? pass(`Цены в тексте есть на ${withPrice.length} страницах.`) : fail("Ни на одной странице нет цены, написанной текстом.", [ctx.home.url]);
    },
  },
  {
    id: "ai-freshness",
    category: "ai",
    severity: "advice",
    title: "Видны признаки свежести",
    explain: "Модели охотнее берут источники с видимой датой обновления.",
    recommendation: "Отдавайте заголовок Last-Modified и держите на странице актуальные даты: год в подвале, даты публикаций.",
    run: (ctx) => {
      const lm = header(ctx.home.headers, "last-modified");
      if (lm) return pass(`Сервер отдаёт Last-Modified: ${lm}.`);
      const year = new Date().getFullYear();
      return new RegExp(`\\b(${year}|${year - 1})\\b`).test(ctx.home.text) || /datePublished|dateModified/.test(ctx.home.html)
        ? pass(`На главной указан актуальный год или дата публикации.`)
        : fail("Ни Last-Modified, ни актуальной даты на главной нет.", [ctx.home.url]);
    },
  },
  {
    id: "ai-faq-block",
    category: "ai",
    severity: "advice",
    title: "Есть блок вопросов и ответов",
    explain: "Пары «вопрос — короткий ответ» нейросети забирают со страницы целиком.",
    recommendation: "Соберите FAQ из 6–8 настоящих вопросов покупателей с короткими ответами по делу.",
    run: (ctx) => {
      const has = okPages(ctx).filter(
        (p) =>
          p.jsonld.some((b) => b.types.includes("FAQPage")) ||
          p.$("details summary").length >= 2 ||
          p.headings.filter((h) => h.text.trim().endsWith("?")).length >= 3 ||
          /(faq|вопрос\S* и ответ|частые вопросы)/i.test(p.headings.map((h) => h.text).join(" ")),
      );
      return has.length ? pass(`Блок вопросов и ответов есть на ${has.length} страницах.`) : fail("Блока вопросов и ответов нет.", [ctx.home.url]);
    },
  },
];
