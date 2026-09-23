import type { CheckDef } from "../types";
import { sameSite } from "../url";
import { fail, header, na, okPages, pagesWord, pass, perPage } from "./util";

const charsetFromHeader = (ct: string) => /charset\s*=\s*["']?([\w-]+)/i.exec(ct)?.[1]?.toLowerCase() ?? null;
const isUtf8 = (cs: string | null) => !!cs && /^utf-?8$/i.test(cs);

export const technicalChecks: CheckDef[] = [
  {
    id: "https-enabled",
    category: "technical",
    severity: "critical",
    title: "Сайт работает по HTTPS",
    explain: "Без шифрования браузер помечает сайт как небезопасный, а поисковики ставят его ниже.",
    recommendation: "Подключите SSL-сертификат (бесплатный Let's Encrypt есть почти у любого хостинга) и откройте сайт по https://.",
    run: (ctx) =>
      ctx.home.url.startsWith("https://") ? pass("Главная открывается по HTTPS.") : fail("Главная открывается по незащищённому HTTP.", [ctx.home.url]),
  },
  {
    id: "no-redirect-loop",
    category: "technical",
    severity: "critical",
    title: "Нет зацикленных переадресаций",
    explain: "Если адреса переадресуют друг на друга по кругу, страница не откроется ни у робота, ни у человека.",
    recommendation: "Проверьте правила переадресации в настройках сервера или CMS и уберите взаимные переходы.",
    run: (ctx) => {
      const loops = [ctx.homeChain, ctx.httpProbe, ctx.altHostProbe].filter((c) => c?.loop);
      return loops.length ? fail("Найдена зацикленная переадресация.", loops.map((c) => c!.hops[0].url)) : pass("Зацикленных переадресаций нет.");
    },
  },
  {
    id: "redirect-chain-max-1",
    category: "technical",
    severity: "important",
    title: "Переадресации не выстраиваются в цепочку",
    explain: "Каждый лишний редирект замедляет загрузку и теряет часть веса ссылки. Допустим один переход.",
    recommendation: "Настройте переадресацию сразу на конечный адрес: например, http → www → https замените одним правилом.",
    run: (ctx) => {
      const chains = [ctx.homeChain, ctx.httpProbe, ctx.altHostProbe].filter((c): c is NonNullable<typeof c> => !!c);
      const long = chains.filter((c) => c.hops.length - 1 > 1);
      return long.length
        ? fail(`Цепочка из ${Math.max(...long.map((c) => c.hops.length - 1))} переадресаций: ${long[0].hops.map((h) => h.url).join(" → ")}.`, long.map((c) => c.hops[0].url))
        : pass("Переадресации ведут на конечный адрес за один шаг.");
    },
  },
  {
    id: "no-5xx-on-crawl",
    category: "technical",
    severity: "critical",
    title: "Нет страниц с ошибкой сервера 5xx",
    explain: "Коды 500–599 означают сбой сервера. Такие страницы выпадают из поиска, а посетитель видит ошибку.",
    recommendation: "Посмотрите логи сервера по этим адресам и устраните ошибку приложения или нехватку ресурсов хостинга.",
    run: (ctx) => {
      const bad = [...ctx.linkStatus].filter(([, s]) => s >= 500).map(([u]) => u);
      return bad.length ? fail(`Адресов с ошибкой 5xx: ${bad.length}.`, bad) : pass("Серверных ошибок на проверенных адресах нет.");
    },
  },
  {
    id: "homepage-status-200",
    category: "technical",
    severity: "critical",
    title: "Главная страница отвечает кодом 200",
    explain: "Если главная отдаёт ошибку, робот может не добраться до остального сайта.",
    recommendation: "Проверьте настройки хостинга и CMS: главная должна отвечать кодом 200.",
    run: (ctx) => (ctx.home.status === 200 ? pass("Главная отвечает кодом 200.") : fail(`Главная отвечает кодом ${ctx.home.status}.`, [ctx.home.url])),
  },
  {
    id: "ttfb-under-600ms",
    category: "technical",
    severity: "advice",
    title: "Сервер отвечает быстрее 600 мс",
    explain: "Чем дольше сервер думает, тем позже человек видит страницу.",
    recommendation: "Включите кэширование страниц, ускорьте запросы к базе данных или смените тариф хостинга.",
    run: (ctx) => (ctx.home.ttfbMs < 600 ? pass(`Сервер ответил за ${ctx.home.ttfbMs} мс.`) : fail(`Сервер ответил за ${ctx.home.ttfbMs} мс.`, [ctx.home.url])),
  },
  {
    id: "ttfb-under-1500ms",
    category: "technical",
    severity: "critical",
    title: "Сервер отвечает быстрее 1,5 секунды",
    explain: "Ответ дольше полутора секунд тратит время посетителя и лимит обхода поискового робота.",
    recommendation: "Проверьте нагрузку на хостинг и тяжёлые плагины, включите серверный кэш.",
    run: (ctx) => (ctx.home.ttfbMs < 1500 ? pass(`Сервер ответил за ${ctx.home.ttfbMs} мс.`) : fail(`Сервер ответил за ${ctx.home.ttfbMs} мс.`, [ctx.home.url])),
  },
  {
    id: "charset-utf8",
    category: "technical",
    severity: "critical",
    title: "Кодировка страницы — UTF-8",
    explain: "Без явной кодировки русский текст может превратиться в нечитаемые символы.",
    recommendation: 'Добавьте в начало <head> строку <meta charset="utf-8"> и отдавайте заголовок Content-Type с charset=utf-8.',
    run: (ctx) =>
      perPage(
        ctx,
        (p) => !isUtf8(charsetFromHeader(header(p.headers, "content-type"))) && !isUtf8(p.metaCharset),
        (n) => `Кодировка UTF-8 не объявлена на ${pagesWord(n)}.`,
        "Кодировка UTF-8 объявлена.",
      ),
  },
  {
    id: "404-returns-404-code",
    category: "technical",
    severity: "important",
    title: "Несуществующий адрес отдаёт код 404",
    explain: "Если на выдуманный адрес сервер отвечает 200, поисковик индексирует бесконечные пустые дубли.",
    recommendation: "Настройте сервер так, чтобы несуществующие адреса возвращали 404 или 410.",
    run: (ctx) => {
      const s = ctx.notFound?.status ?? 0;
      if (!s) return na("Не удалось проверить несуществующий адрес.");
      return s === 404 || s === 410 ? pass(`Несуществующий адрес отвечает кодом ${s}.`) : fail(`Несуществующий адрес отвечает кодом ${s}.`, [ctx.notFound!.url]);
    },
  },
  {
    id: "404-page-is-custom",
    category: "technical",
    severity: "advice",
    title: "Страница 404 оформлена под сайт",
    explain: "Своя страница «не найдено» с меню и ссылками удерживает посетителя, типовая заглушка сервера отпугивает.",
    recommendation: "Сделайте страницу 404 в дизайне сайта: объяснение и ссылки на главную и популярные разделы.",
    run: (ctx) => {
      const r = ctx.notFound;
      if (!r || !r.status) return na("Не удалось получить страницу 404.");
      const links = (r.body.match(/<a\s[^>]*href=/gi) || []).length;
      return links >= 3 && r.body.length > 1500
        ? pass(`На странице 404 есть навигация: ${links} ссылок.`)
        : fail("Страница 404 — типовая заглушка без навигации.", [r.url]);
    },
  },
  {
    id: "www-canonical-redirect",
    category: "technical",
    severity: "important",
    title: "Версии сайта с www и без склеены",
    explain: "Если сайт открывается и с www, и без него, поисковик видит два сайта с одинаковым содержимым.",
    recommendation: "Выберите основную версию домена и поставьте постоянную переадресацию 301 со второй.",
    run: (ctx) => {
      const c = ctx.altHostProbe;
      if (!c) return na("Второй вариант домена не отвечает, склеивать нечего.");
      const finalHost = new URL(c.final.url).hostname;
      if (c.hops.length > 1 && finalHost === ctx.host) return pass(`${new URL(c.hops[0].url).host} переадресует на основной домен.`);
      if (c.final.status >= 400) return pass("Второй вариант домена не открывается.");
      return fail(`${new URL(c.hops[0].url).host} открывается отдельно, без переадресации.`, [c.hops[0].url]);
    },
  },
  {
    id: "cache-headers-static",
    category: "technical",
    severity: "advice",
    title: "Сервер отдаёт заголовки кэширования",
    explain: "Cache-Control, ETag и Last-Modified позволяют браузеру не скачивать одно и то же заново.",
    recommendation: "Настройте Cache-Control для статических файлов (картинки, CSS, JS), например на 30 дней.",
    run: (ctx) => {
      const assets = ctx.staticAssets.filter((a) => a.status === 200);
      if (!assets.length) return na("Статических файлов для проверки не нашлось.");
      const bad = assets.filter((a) => !header(a.headers, "cache-control") && !header(a.headers, "etag") && !header(a.headers, "last-modified"));
      return bad.length ? fail(`Файлов без заголовков кэширования: ${bad.length} из ${assets.length}.`, bad.map((a) => a.url)) : pass("Статические файлы отдаются с заголовками кэширования.");
    },
  },
  {
    id: "no-server-version-disclosure",
    category: "technical",
    severity: "advice",
    title: "Сервер не раскрывает свою версию",
    explain: "Точная версия сервера в заголовках подсказывает злоумышленнику, какие уязвимости пробовать.",
    recommendation: "Скройте версию в настройках сервера (в nginx — server_tokens off) и уберите заголовок X-Powered-By.",
    run: (ctx) => {
      const h = ctx.home.headers;
      const leaks = [header(h, "server"), header(h, "x-powered-by"), header(h, "x-aspnet-version")].filter((v) => v && (/\d/.test(v) || v === header(h, "x-powered-by")));
      return leaks.length ? fail(`Заголовки раскрывают версию: ${leaks.join(", ")}.`, [ctx.home.url]) : pass("Версия сервера в заголовках не видна.");
    },
  },
  {
    id: "favicon-exists",
    category: "technical",
    severity: "advice",
    title: "У сайта есть значок (favicon)",
    explain: "Значок видно во вкладке браузера, в закладках и в выдаче. Без него сайт выглядит незаконченным.",
    recommendation: 'Положите файл значка в корень сайта и подключите его строкой <link rel="icon" href="/favicon.svg">.',
    run: (ctx) => {
      const declared = ctx.home.$('link[rel~="icon" i], link[rel="shortcut icon" i]').length > 0;
      return declared || ctx.faviconProbe?.status === 200 ? pass("Значок сайта найден.") : fail("Значок сайта не найден.", [ctx.home.url]);
    },
  },
  {
    id: "page-size-under-2mb",
    category: "technical",
    severity: "important",
    title: "Страница весит не больше 2 МБ",
    explain: "Тяжёлая страница долго грузится на мобильном интернете, часть посетителей уходит.",
    recommendation: "Сожмите картинки в WebP или AVIF, уберите неиспользуемые скрипты и шрифты.",
    run: (ctx) =>
      perPage(
        ctx,
        (p) => {
          const imgBytes = p.images.reduce((sum, i) => sum + ((i.abs && ctx.images.get(i.abs)?.bytes) || 0), 0);
          return p.bytes + imgBytes > 2 * 1024 * 1024;
        },
        (n) => `Страниц тяжелее 2 МБ (HTML и картинки): ${n}.`,
        "Все страницы легче 2 МБ.",
      ),
  },
  {
    id: "compression-enabled",
    category: "technical",
    severity: "important",
    title: "Включено сжатие (gzip или brotli)",
    explain: "Сжатие уменьшает объём страницы в несколько раз и ускоряет загрузку.",
    recommendation: "Включите gzip или brotli в настройках веб-сервера для HTML, CSS и JS.",
    run: (ctx) => {
      const enc = header(ctx.home.headers, "content-encoding");
      if (/gzip|br|deflate|zstd/i.test(enc)) return pass(`Главная отдаётся со сжатием ${enc}.`);
      if (ctx.home.bytes < 1400) return na("Страница слишком маленькая, сжатие ей не нужно.");
      return fail("Главная отдаётся без сжатия.", [ctx.home.url]);
    },
  },
  {
    id: "no-mixed-content",
    category: "technical",
    severity: "important",
    title: "На HTTPS-страницах нет ресурсов по HTTP",
    explain: "Картинки и скрипты по http:// на защищённой странице блокируются браузером и ломают вёрстку.",
    recommendation: "Замените в коде ссылки http:// на https:// у картинок, скриптов и стилей.",
    run: (ctx) =>
      perPage(
        ctx,
        (p) => p.url.startsWith("https://") && /<(?:img|script|iframe|source|video|audio)\b[^>]*\ssrc=["']http:\/\/|<link\b[^>]*href=["']http:\/\/[^"']+\.css/i.test(p.html),
        (n) => `Страниц со смешанным содержимым: ${n}.`,
        "Смешанного содержимого нет.",
      ),
  },
  {
    id: "hsts-header",
    category: "technical",
    severity: "advice",
    title: "Включён заголовок HSTS",
    explain: "Strict-Transport-Security заставляет браузер сразу открывать сайт по защищённому протоколу.",
    recommendation: "Добавьте заголовок Strict-Transport-Security: max-age=31536000, когда весь сайт работает по HTTPS.",
    run: (ctx) => {
      if (!ctx.home.url.startsWith("https://")) return na("Сайт работает без HTTPS.");
      return header(ctx.home.headers, "strict-transport-security") ? pass("Заголовок HSTS отдаётся.") : fail("Заголовок Strict-Transport-Security не отдаётся.", [ctx.home.url]);
    },
  },
  {
    id: "http-redirects-to-https",
    category: "technical",
    severity: "important",
    title: "Адрес http:// переадресует на https://",
    explain: "Если сайт открывается и по http, и по https, поисковик видит два одинаковых сайта.",
    recommendation: "Добавьте постоянную переадресацию 301 со всех http-адресов на https.",
    run: (ctx) => {
      const c = ctx.httpProbe;
      if (!ctx.home.url.startsWith("https://")) return na("Сайт работает без HTTPS.");
      if (!c || c.final.status === 0) return pass("По http:// сайт не открывается.");
      return c.final.url.startsWith("https://") && sameSite(new URL(c.final.url).hostname, ctx.host)
        ? pass("http:// переадресует на https://.")
        : fail("Сайт открывается по http:// без переадресации.", [c.hops[0].url]);
    },
  },
  {
    id: "response-consistent-encoding",
    category: "technical",
    severity: "advice",
    title: "Кодировка в заголовке и в коде совпадает",
    explain: "Когда сервер объявляет одну кодировку, а страница другую, текст может рассыпаться.",
    recommendation: "Приведите к UTF-8 и заголовок Content-Type, и мета-тег charset.",
    run: (ctx) =>
      perPage(
        ctx,
        (p) => {
          const h = charsetFromHeader(header(p.headers, "content-type"));
          const m = p.metaCharset;
          return !!h && !!m && h.replace("-", "") !== m.replace("-", "");
        },
        (n) => `Страниц с разной кодировкой в заголовке и коде: ${n}.`,
        "Кодировки совпадают.",
        okPages(ctx),
      ),
  },
];
