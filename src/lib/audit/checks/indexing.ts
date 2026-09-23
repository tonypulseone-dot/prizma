import { isAllowed } from "../robots";
import type { CheckDef } from "../types";
import { sameSite } from "../url";
import { fail, header, na, pass, perPage } from "./util";

const path = (u: string) => {
  try {
    return new URL(u).pathname;
  } catch {
    return "";
  }
};

const decodedPath = (u: string) => {
  const p = path(u);
  try {
    return decodeURIComponent(p);
  } catch {
    return p;
  }
};

export const indexingChecks: CheckDef[] = [
  {
    id: "robots-not-disallow-all",
    category: "indexing",
    severity: "critical",
    title: "Сайт не закрыт от индексации в robots.txt",
    explain: "«Disallow: /» для всех роботов запрещает обход всего сайта, и он выпадает из поиска.",
    recommendation: "Уберите Disallow: / для User-agent: *, закрытыми оставьте только служебные разделы.",
    run: (ctx) =>
      isAllowed(ctx.robots, "*", "/") && isAllowed(ctx.robots, "YandexBot", "/") && isAllowed(ctx.robots, "Googlebot", "/")
        ? pass("Главная открыта для поисковых роботов.")
        : fail("robots.txt запрещает поисковикам обходить сайт.", [new URL("/robots.txt", ctx.origin).toString()]),
  },
  {
    id: "no-x-robots-noindex-header",
    category: "indexing",
    severity: "critical",
    title: "Нет заголовка X-Robots-Tag: noindex",
    explain: "Запрет индексации можно случайно выставить в настройках сервера, и без проверки его не заметить.",
    recommendation: "Уберите noindex из заголовка X-Robots-Tag в настройках сервера или хостинга.",
    run: (ctx) => perPage(ctx, (p) => /noindex/i.test(header(p.headers, "x-robots-tag")), (n) => `Страниц с X-Robots-Tag: noindex: ${n}.`, "Заголовок noindex не отдаётся."),
  },
  {
    id: "no-noindex-on-crawled-pages",
    category: "indexing",
    severity: "critical",
    title: "Страницы не закрыты мета-тегом noindex",
    explain: "Мета-тег robots с noindex прячет страницу из поиска. Его часто забывают после разработки.",
    recommendation: 'Уберите noindex из <meta name="robots"> на страницах, которые должны быть в поиске.',
    run: (ctx) => perPage(ctx, (p) => /noindex/.test(p.metaRobots), (n) => `Страниц с мета-тегом noindex: ${n}.`, "Мета-тега noindex нет."),
  },
  {
    id: "canonical-not-pointing-elsewhere",
    category: "indexing",
    severity: "critical",
    title: "Canonical ведёт на этот же сайт",
    explain: "Canonical на чужой домен отдаёт страницу другому сайту, и она пропадает из поиска.",
    recommendation: "Исправьте canonical на адрес своего домена. Часто это остаётся после переноса или копирования шаблона.",
    run: (ctx) =>
      perPage(
        ctx,
        (p) =>
          p.canonicals.some((c) => {
            try {
              return !sameSite(new URL(c, p.url).hostname, ctx.host);
            } catch {
              return false;
            }
          }),
        (n) => `Страниц с canonical на чужой домен: ${n}.`,
        "Canonical ведёт на этот же сайт.",
      ),
  },
  {
    id: "canonical-single",
    category: "indexing",
    severity: "important",
    title: "На странице один тег canonical",
    explain: "Несколько canonical противоречат друг другу, и поисковик игнорирует все.",
    recommendation: 'Оставьте один <link rel="canonical">. Дубль часто добавляет SEO-плагин поверх шаблона.',
    run: (ctx) => perPage(ctx, (p) => p.canonicals.length > 1, (n) => `Страниц с несколькими canonical: ${n}.`, "Canonical не дублируется."),
  },
  {
    id: "canonical-present",
    category: "indexing",
    severity: "important",
    title: "У страниц указан canonical",
    explain: "Canonical говорит поисковику, какой адрес основной. Это защищает от дублей с параметрами.",
    recommendation: 'Добавьте в <head> каждой страницы <link rel="canonical" href="полный адрес страницы">.',
    run: (ctx) => perPage(ctx, (p) => p.canonicals.length === 0, (n) => `Страниц без canonical: ${n}.`, "Canonical указан на всех страницах."),
  },
  {
    id: "sitemap-valid-xml",
    category: "indexing",
    severity: "important",
    title: "Карта сайта — корректный XML",
    explain: "Если вместо XML отдаётся HTML или файл повреждён, поисковик проигнорирует карту.",
    recommendation: "Убедитесь, что sitemap.xml открывается как XML и содержит <urlset> и <loc> с адресами.",
    run: (ctx) => {
      if (!ctx.sitemap.found) return na("Карта сайта не найдена.");
      return ctx.sitemap.valid ? pass(`В карте сайта ${ctx.sitemap.urls.length} адресов.`) : fail("Карта сайта не является корректным XML со списком адресов.", [ctx.sitemap.source || ""]);
    },
  },
  {
    id: "sitemap-exists",
    category: "indexing",
    severity: "important",
    title: "Карта сайта sitemap.xml доступна",
    explain: "Карта ускоряет попадание новых страниц в индекс.",
    recommendation: "Сгенерируйте sitemap.xml средствами CMS и положите в корень сайта.",
    run: (ctx) => (ctx.sitemap.found ? pass(`Карта сайта найдена: ${ctx.sitemap.source}.`) : fail("Карта сайта не найдена.", [new URL("/sitemap.xml", ctx.origin).toString()])),
  },
  {
    id: "robots-txt-exists",
    category: "indexing",
    severity: "important",
    title: "Файл robots.txt доступен",
    explain: "robots.txt робот запрашивает первым: там правила обхода и путь к карте сайта.",
    recommendation: "Создайте robots.txt в корне сайта и укажите в нём строку Sitemap.",
    run: (ctx) => (ctx.robots.status === 200 && ctx.robots.isText ? pass("robots.txt доступен.") : fail(`robots.txt не найден (код ${ctx.robots.status}).`, [new URL("/robots.txt", ctx.origin).toString()])),
  },
  {
    id: "robots-txt-parseable",
    category: "indexing",
    severity: "important",
    title: "robots.txt читается без ошибок",
    explain: "Пустой файл или строки без директив робот не поймёт.",
    recommendation: "Проверьте синтаксис: каждая строка — директива User-agent, Disallow, Allow или Sitemap с двоеточием.",
    run: (ctx) => {
      if (ctx.robots.status !== 200) return na("robots.txt не найден.");
      return ctx.robots.directives > 0 ? pass(`В robots.txt ${ctx.robots.directives} директив.`) : fail("В robots.txt нет ни одной понятной директивы.", [new URL("/robots.txt", ctx.origin).toString()]);
    },
  },
  {
    id: "url-no-uppercase-or-spaces",
    category: "indexing",
    severity: "advice",
    title: "В адресах нет заглавных букв и пробелов",
    explain: "/Uslugi и /uslugi — разные адреса для сервера. Это плодит дубли.",
    recommendation: "Приведите адреса к нижнему регистру, пробелы замените дефисами и поставьте переадресацию со старых вариантов.",
    run: (ctx) => perPage(ctx, (p) => /[A-Z]|\s/.test(decodedPath(p.url)), (n) => `Адресов с заглавными буквами или пробелами: ${n}.`, "Адреса в нижнем регистре и без пробелов."),
  },
  {
    id: "url-no-cyrillic",
    category: "indexing",
    severity: "advice",
    title: "В адресах страниц нет кириллицы",
    explain: "Кириллица в адресе при копировании превращается в длинную строку с процентами.",
    recommendation: "Переведите адреса в латиницу (транслит) и настройте переадресацию со старых.",
    run: (ctx) =>
      perPage(
        ctx,
        (p) => /[а-яё]/i.test(decodedPath(p.url)),
        (n) => `Адресов с кириллицей: ${n}.`,
        "Кириллицы в адресах нет.",
      ),
  },
  {
    id: "canonical-absolute-url",
    category: "indexing",
    severity: "advice",
    title: "Canonical записан полным адресом",
    explain: "Относительный canonical поисковики трактуют по-разному.",
    recommendation: 'Пишите canonical целиком: href="https://ваш-сайт/раздел/".',
    run: (ctx) => perPage(ctx, (p) => p.canonicals.some((c) => !/^https?:\/\//i.test(c)), (n) => `Страниц с относительным canonical: ${n}.`, "Canonical записан полностью."),
  },
  {
    id: "sitemap-covers-homepage",
    category: "indexing",
    severity: "advice",
    title: "Главная есть в карте сайта",
    explain: "Главная — самая важная страница, она должна быть в списке для обхода.",
    recommendation: "Добавьте адрес главной в sitemap.xml.",
    run: (ctx) => {
      if (!ctx.sitemap.valid) return na("Карта сайта не найдена или пустая.");
      const home = new URL(ctx.home.url);
      const found = ctx.sitemap.urls.some((u) => {
        try {
          const x = new URL(u);
          return sameSite(x.hostname, home.hostname) && (x.pathname === "/" || x.pathname === "");
        } catch {
          return false;
        }
      });
      return found ? pass("Главная есть в карте сайта.") : fail("Главной нет в карте сайта.", [ctx.sitemap.source || ""]);
    },
  },
  {
    id: "sitemap-urls-same-host",
    category: "indexing",
    severity: "advice",
    title: "Все адреса в карте сайта с этого домена",
    explain: "Чужие адреса в карте поисковик игнорирует, а карта выглядит устаревшей.",
    recommendation: "Пересоберите sitemap.xml так, чтобы в нём были только адреса вашего домена.",
    run: (ctx) => {
      if (!ctx.sitemap.valid) return na("Карта сайта не найдена или пустая.");
      const foreign = ctx.sitemap.urls.filter((u) => {
        try {
          return new URL(u).hostname !== ctx.host;
        } catch {
          return true;
        }
      });
      return foreign.length ? fail(`Адресов с другого домена в карте: ${foreign.length}.`, foreign.slice(0, 20)) : pass("Все адреса в карте с этого домена.");
    },
  },
  {
    id: "robots-declares-sitemap",
    category: "indexing",
    severity: "advice",
    title: "В robots.txt указана карта сайта",
    explain: "Строка Sitemap в robots.txt — самый надёжный способ показать поисковику список страниц.",
    recommendation: "Добавьте в robots.txt строку Sitemap: https://ваш-сайт/sitemap.xml.",
    run: (ctx) => {
      if (ctx.robots.status !== 200) return na("robots.txt не найден.");
      return ctx.robots.sitemaps.length ? pass(`В robots.txt указано: ${ctx.robots.sitemaps[0]}.`) : fail("В robots.txt нет строки Sitemap.", [new URL("/robots.txt", ctx.origin).toString()]);
    },
  },
];
