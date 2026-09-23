import type { CheckDef } from "../types";
import { fail, na, okPages, pass, perPage } from "./util";

const u = (x: string) => new URL(x);
const clean = (x: string) => {
  const v = u(x);
  v.hash = "";
  return v.toString();
};

export const structureChecks: CheckDef[] = [
  {
    id: "no-broken-internal-links",
    category: "structure",
    severity: "critical",
    title: "Нет битых внутренних ссылок",
    explain: "Ссылка в никуда уводит посетителя на ошибку и тратит обход робота. Это прямая потеря заявок.",
    recommendation: "Исправьте адреса битых ссылок или поставьте с удалённых страниц переадресацию 301.",
    run: (ctx) => {
      const broken = [...ctx.linkSources.keys()].filter((l) => {
        const s = ctx.linkStatus.get(l);
        return s !== undefined && s >= 400 && s < 500;
      });
      if (!broken.length) return pass(`Проверено внутренних ссылок: ${[...ctx.linkSources.keys()].filter((l) => ctx.linkStatus.has(l)).length}, битых нет.`);
      const sources = broken.flatMap((b) => [...(ctx.linkSources.get(b) || [])]);
      return fail(`Битых внутренних ссылок: ${broken.length} (например, ${broken[0]}).`, sources);
    },
  },
  {
    id: "friendly-urls",
    category: "structure",
    severity: "important",
    title: "Адреса страниц человекопонятные (ЧПУ)",
    explain: "Адрес вида /page.php?id=5 ничего не говорит ни человеку, ни поиску.",
    recommendation: "Настройте адреса латиницей по смыслу раздела, например /uslugi/remont/, и поставьте 301 со старых.",
    run: (ctx) =>
      perPage(ctx, (p) => /\.(php|aspx?|jsp|cgi)(\?|$)|[?&](id|page_id|p|cat|option)=/i.test(u(p.url).pathname + u(p.url).search), (n) => `Страниц с техническими адресами: ${n}.`, "Адреса понятные."),
  },
  {
    id: "no-broken-images",
    category: "structure",
    severity: "important",
    title: "У всех картинок рабочий адрес",
    explain: "Картинка с неправильным адресом показывается сломанным значком, сайт выглядит заброшенным.",
    recommendation: "Проверьте адреса картинок, особенно в блоках, перенесённых со старого сайта.",
    run: (ctx) => {
      const bad = [...ctx.images.values()].filter((i) => i.status >= 400 || i.status === 0).map((i) => i.url);
      const empty = okPages(ctx).filter((p) => p.images.some((i) => !i.src)).map((p) => p.url);
      if (!bad.length && !empty.length) return ctx.images.size ? pass(`Проверено картинок: ${ctx.images.size}, битых нет.`) : na("Картинок нет.");
      return fail(`Битых картинок: ${bad.length + empty.length}.`, [...bad, ...empty]);
    },
  },
  {
    id: "nav-links-are-anchors",
    category: "structure",
    severity: "important",
    title: "Меню сделано обычными ссылками",
    explain: "Если пункты меню — кнопки на скриптах, робот не перейдёт по ним и не увидит разделы.",
    recommendation: "Сделайте пункты меню тегами <a href> с настоящими адресами.",
    run: (ctx) => {
      const $ = ctx.home.$;
      const nav = $("nav, header, [role=navigation]");
      if (!nav.length) return na("Меню на главной не найдено.");
      const anchors = nav.find("a[href]").toArray().filter((a) => !/^(#|javascript:)/i.test($(a).attr("href") || "")).length;
      const fake = nav.find("[onclick], a[href^='javascript:'], span[role=link], div[role=link]").length;
      return anchors === 0 && fake > 0 ? fail(`В меню ${fake} пунктов на скриптах и ни одной настоящей ссылки.`, [ctx.home.url]) : pass(`В меню ${anchors} обычных ссылок.`);
    },
  },
  {
    id: "sitemap-covers-crawled-pages",
    category: "structure",
    severity: "important",
    title: "Карта сайта охватывает найденные страницы",
    explain: "Страницу, которой нет в карте, поиск найдёт позже и будет реже переобходить.",
    recommendation: "Настройте автоматическое обновление sitemap.xml при публикации страниц.",
    run: (ctx) => {
      if (!ctx.sitemap.valid) return na("Карта сайта не найдена.");
      const inMap = new Set(ctx.sitemap.urls.map((x) => {
        try {
          return clean(x).replace(/\/$/, "");
        } catch {
          return x;
        }
      }));
      const missing = okPages(ctx).filter((p) => !/noindex/.test(p.metaRobots) && !inMap.has(clean(p.url).replace(/\/$/, ""))).map((p) => p.url);
      return missing.length ? fail(`Страниц вне карты сайта: ${missing.length}.`, missing) : pass("Все найденные страницы есть в карте сайта.");
    },
  },
  {
    id: "url-depth-max-4",
    category: "structure",
    severity: "advice",
    title: "Вложенность адресов не больше 4 уровней",
    explain: "До глубоко спрятанной страницы робот доходит реже, а человек почти никогда.",
    recommendation: "Упростите структуру: /uslugi/remont/ лучше, чем /catalog/services/remont/kvartiry/pod-klyuch/.",
    run: (ctx) => perPage(ctx, (p) => p.depth > 4, (n) => `Страниц глубже 4 уровней: ${n}.`, "Вложенность адресов в норме."),
  },
  {
    id: "url-length-max-115",
    category: "structure",
    severity: "advice",
    title: "Длина адреса не больше 115 символов",
    explain: "Длинные адреса обрезаются в выдаче и мессенджерах, ими неудобно делиться.",
    recommendation: "Сократите адреса: уберите лишние слова и повторы разделов.",
    run: (ctx) => perPage(ctx, (p) => p.url.length > 115, (n) => `Адресов длиннее 115 символов: ${n}.`, "Длина адресов в норме."),
  },
  {
    id: "breadcrumbs-present",
    category: "structure",
    severity: "advice",
    title: "На внутренних страницах есть «хлебные крошки»",
    explain: "Крошки показывают, где человек находится, а поиску — структуру сайта.",
    recommendation: "Добавьте цепочку «Главная → Раздел → Страница» и разметьте её схемой BreadcrumbList.",
    run: (ctx) =>
      perPage(
        ctx,
        (p) => !p.hasBreadcrumbs,
        (n) => `Внутренних страниц без «хлебных крошек»: ${n}.`,
        "«Хлебные крошки» есть на внутренних страницах.",
        okPages(ctx).filter((p) => p.depth >= 2),
      ),
  },
  {
    id: "no-orphan-crawled-pages",
    category: "structure",
    severity: "advice",
    title: "На каждую страницу ведёт ссылка",
    explain: "Страница без входящих ссылок почти не получает веса и часто выпадает из индекса.",
    recommendation: "Поставьте ссылки на такие страницы из меню, каталога или текста смежных страниц.",
    run: (ctx) =>
      perPage(
        ctx,
        (p) => {
          const key = clean(p.url);
          const sources = ctx.linkSources.get(key) || ctx.linkSources.get(key.replace(/\/$/, "")) || ctx.linkSources.get(key + "/");
          return !sources || [...sources].every((s) => s === p.url);
        },
        (n) => `Страниц без входящих ссылок: ${n}.`,
        "На все страницы ведут ссылки.",
        okPages(ctx).filter((p) => p.url !== ctx.home.url),
      ),
  },
  {
    id: "trailing-slash-consistency",
    category: "structure",
    severity: "advice",
    title: "Слэш на конце адресов единообразен",
    explain: "Если часть адресов со слэшем, а часть без, поиск может посчитать их разными страницами.",
    recommendation: "Выберите один вариант (обычно со слэшем) и поставьте 301 со второго.",
    run: (ctx) => {
      const paths = [...ctx.linkSources.keys()].map((x) => u(x).pathname).filter((p) => p !== "/" && !/\.\w{2,5}$/.test(p));
      if (paths.length < 5) return na("Мало внутренних адресов для оценки.");
      const withSlash = paths.filter((p) => p.endsWith("/")).length;
      const minority = Math.min(withSlash, paths.length - withSlash);
      return minority / paths.length > 0.2 ? fail(`Со слэшем ${withSlash} адресов, без слэша ${paths.length - withSlash}.`, [ctx.home.url]) : pass("Слэш на конце используется единообразно.");
    },
  },
  {
    id: "no-query-string-duplicates",
    category: "structure",
    severity: "advice",
    title: "Нет дублей страниц с параметрами",
    explain: "Метки рекламы и сортировки создают копии страницы, и поиск тратит на них обход.",
    recommendation: "Закройте адреса с параметрами тегом canonical на основную версию, мусорные параметры — правилом Clean-param в robots.txt.",
    run: (ctx) =>
      perPage(
        ctx,
        (p) => !!u(p.url).search && !p.canonicals.some((c) => {
          try {
            return !new URL(c, p.url).search;
          } catch {
            return false;
          }
        }),
        (n) => `Страниц с параметрами без canonical на основную версию: ${n}.`,
        "Дублей с параметрами нет.",
      ),
  },
  {
    id: "homepage-links-count",
    category: "structure",
    severity: "advice",
    title: "На главной от 5 до 200 внутренних ссылок",
    explain: "Слишком мало ссылок — робот не найдёт разделы. Слишком много — вес размывается.",
    recommendation: "Оставьте на главной ссылки на ключевые разделы: обычно хватает 20–60 вместе с меню и подвалом.",
    run: (ctx) => {
      const n = ctx.home.links.filter((l) => l.internal).length;
      return n >= 5 && n <= 200 ? pass(`На главной ${n} внутренних ссылок.`) : fail(`На главной ${n} внутренних ссылок.`, [ctx.home.url]);
    },
  },
  {
    id: "anchor-text-not-empty",
    category: "structure",
    severity: "advice",
    title: "У ссылок есть текст или подпись",
    explain: "Ссылка без текста ничего не сообщает ни поиску, ни человеку с экранным диктором.",
    recommendation: "Дайте ссылкам-иконкам aria-label, а текстовым — осмысленный текст вместо «здесь».",
    run: (ctx) => perPage(ctx, (p) => p.links.some((l) => !l.text && !l.ariaLabel && !l.hasImgAlt), (n) => `Страниц со ссылками без текста: ${n}.`, "У всех ссылок есть текст."),
  },
  {
    id: "no-links-to-redirects",
    category: "structure",
    severity: "advice",
    title: "Внутренние ссылки ведут без переадресаций",
    explain: "Каждая переадресация — лишний запрос и потеря части веса ссылки.",
    recommendation: "Замените в меню и текстах адреса, которые переадресуют, на конечные.",
    run: (ctx) => {
      const redirecting = [...ctx.linkSources.keys()].filter((l) => {
        const s = ctx.linkStatus.get(l);
        return s !== undefined && s >= 300 && s < 400;
      });
      const sources = redirecting.flatMap((r) => [...(ctx.linkSources.get(r) || [])]);
      return redirecting.length ? fail(`Ссылок на адреса с переадресацией: ${redirecting.length}.`, sources) : pass("Внутренние ссылки ведут напрямую.");
    },
  },
];
