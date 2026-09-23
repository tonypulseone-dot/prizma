import type { CheckDef, PageData, SiteContext } from "../types";
import { fail, na, okPages, pass, perPage } from "./util";

const FILENAME_ALT = /^[\w-]+\.(jpe?g|png|gif|webp|avif|svg)$|^(img|image|dsc|photo|screenshot)[_-]?\d+/i;
const PLACEHOLDER = /(lorem ipsum|dolor sit amet|здесь будет текст|текст-заглушка|рыба текст|тут будет описание|sample text)/i;
const RASTER = /\.(jpe?g|png|gif|webp|avif|bmp)(\?|$)/i;

function shingles(text: string): Set<string> {
  const w = text.toLowerCase().split(/[^\p{L}\d]+/u).filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + 5 <= w.length; i++) out.add(w.slice(i, i + 5).join(" "));
  return out;
}

function nearDuplicates(ctx: SiteContext): string[] {
  const pages = okPages(ctx).filter((p) => p.words >= 120);
  const sets = pages.map((p) => shingles(p.topText + " " + p.text.slice(0, 6000)));
  const hits = new Set<string>();
  for (let i = 0; i < pages.length; i++)
    for (let j = i + 1; j < pages.length; j++) {
      const a = sets[i];
      const b = sets[j];
      if (!a.size || !b.size) continue;
      let inter = 0;
      for (const s of a) if (b.has(s)) inter++;
      if (inter / (a.size + b.size - inter) > 0.9) {
        hits.add(pages[i].url);
        hits.add(pages[j].url);
      }
    }
  return [...hits];
}

const contentImages = (p: PageData) => p.images.filter((i) => i.src && !/\.svg(\?|$)/i.test(i.src) && !i.src.startsWith("data:"));

export const contentChecks: CheckDef[] = [
  {
    id: "no-placeholder-text",
    category: "content",
    severity: "critical",
    title: "На сайте нет текста-заглушки",
    explain: "Lorem ipsum и «здесь будет текст» на живом сайте разрушают доверие и показывают поиску, что страница не готова.",
    recommendation: "Найдите остатки рыбного текста и замените их настоящим содержанием или скройте эти блоки.",
    run: (ctx) => perPage(ctx, (p) => PLACEHOLDER.test(p.text), (n) => `Страниц с текстом-заглушкой: ${n}.`, "Текста-заглушки нет."),
  },
  {
    id: "image-weight-limit",
    category: "content",
    severity: "important",
    title: "Картинки весят не больше 300 КБ",
    explain: "Тяжёлые картинки — главная причина медленной загрузки на мобильном интернете.",
    recommendation: "Сожмите картинки и сохраните в WebP: фото шириной 1600 пикселей нормально весит 100–200 КБ.",
    run: (ctx) => {
      const heavy = [...ctx.images.values()].filter((i) => i.status === 200 && (i.bytes || 0) > 300 * 1024);
      if (!ctx.images.size) return na("Картинок на проверенных страницах нет.");
      return heavy.length ? fail(`Картинок тяжелее 300 КБ: ${heavy.length}.`, heavy.map((i) => i.url)) : pass("Все проверенные картинки легче 300 КБ.");
    },
  },
  {
    id: "images-have-alt",
    category: "content",
    severity: "important",
    title: "У картинок есть атрибут alt",
    explain: "По alt картинка попадает в поиск по картинкам, его же читает экранный диктор незрячему посетителю.",
    recommendation: 'Опишите каждую значимую картинку одной фразой. Декоративным оставьте пустой alt="".',
    run: (ctx) => {
      const n = okPages(ctx).reduce((s, p) => s + p.images.filter((i) => i.alt === null).length, 0);
      if (!okPages(ctx).some((p) => p.images.length)) return na("Картинок нет.");
      return perPage(ctx, (p) => p.images.some((i) => i.alt === null), () => `Картинок без alt: ${n}.`, "У всех картинок есть alt.");
    },
  },
  {
    id: "h2-present",
    category: "content",
    severity: "important",
    title: "Текст разбит подзаголовками H2",
    explain: "Сплошное полотно без подзаголовков плохо читают люди, а поиск хуже понимает блоки.",
    recommendation: "Разбейте текст на смысловые блоки и дайте каждому подзаголовок H2.",
    run: (ctx) =>
      perPage(
        ctx,
        (p) => !p.headings.some((h) => h.level === 2),
        (n) => `Страниц с текстом без H2: ${n}.`,
        "Тексты разбиты подзаголовками.",
        okPages(ctx).filter((p) => p.words >= 250),
      ),
  },
  {
    id: "heading-hierarchy-no-skip",
    category: "content",
    severity: "important",
    title: "Заголовки идут по порядку, без пропусков",
    explain: "Скачок с H1 сразу на H3 сбивает и читателя, и поисковую систему.",
    recommendation: "Выстройте заголовки лесенкой: H1 — страница, H2 — разделы, H3 — подпункты. Не выбирайте уровень ради размера шрифта.",
    run: (ctx) =>
      perPage(
        ctx,
        (p) => p.headings.some((h, i) => i > 0 && h.level - p.headings[i - 1].level > 1),
        (n) => `Страниц с пропуском уровня заголовка: ${n}.`,
        "Уровни заголовков идут по порядку.",
      ),
  },
  {
    id: "text-length-min",
    category: "content",
    severity: "important",
    title: "На страницах есть текст (от 200 слов)",
    explain: "Поиск ранжирует страницу по тексту. Если текста почти нет, странице нечем ответить на запрос.",
    recommendation: "Доведите текст ключевых страниц до 200–300 слов: услуга, состав работ, сроки, цена.",
    run: (ctx) => perPage(ctx, (p) => p.words < 200, (n, t) => `Страниц короче 200 слов: ${n} из ${t}.`, "На всех страницах достаточно текста."),
  },
  {
    id: "contacts-present-on-site",
    category: "content",
    severity: "important",
    title: "На сайте есть телефон или email",
    explain: "Контакты — то, ради чего приходят на сайт услуг. Без них падает и конверсия, и оценка поиска.",
    recommendation: "Разместите телефон в шапке ссылкой tel: и продублируйте контакты в подвале и на странице «Контакты».",
    run: (ctx) => {
      const has = okPages(ctx).some((p) => /href=["'](tel:|mailto:)/i.test(p.html) || /(\+7|8)[\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/.test(p.text) || /[\w.+-]+@[\w-]+\.[\w.]+/.test(p.text));
      return has ? pass("Телефон или email на сайте есть.") : fail("Ни телефона, ни email на проверенных страницах нет.", [ctx.home.url]);
    },
  },
  {
    id: "duplicate-content-across-pages",
    category: "content",
    severity: "important",
    title: "Тексты страниц не дублируют друг друга",
    explain: "Одинаковый текст на разных адресах заставляет поиск выбрать одну страницу и забыть остальные.",
    recommendation: "Перепишите совпадающие блоки под свой запрос каждой страницы или склейте дубли переадресацией.",
    run: (ctx) => {
      const d = nearDuplicates(ctx);
      return d.length ? fail(`Страниц с почти одинаковым текстом: ${d.length}.`, d) : pass("Дублей текста не найдено.");
    },
  },
  {
    id: "alt-not-just-filename",
    category: "content",
    severity: "advice",
    title: "В alt текст, а не имя файла",
    explain: "alt вида IMG_1234.jpg не говорит поиску, что на картинке.",
    recommendation: "Замените имена файлов в alt коротким описанием изображения.",
    run: (ctx) => perPage(ctx, (p) => p.images.some((i) => !!i.alt && FILENAME_ALT.test(i.alt.trim())), (n) => `Страниц с именами файлов в alt: ${n}.`, "В alt нет имён файлов."),
  },
  {
    id: "alt-coverage-ratio",
    category: "content",
    severity: "advice",
    title: "Не меньше 90% картинок с осмысленным alt",
    explain: "Единичный пропуск не страшен, но если описания нет у каждой пятой картинки, трафик из поиска по картинкам теряется.",
    recommendation: "Пройдите по галереям и карточкам и допишите описания картинкам с пустым alt.",
    run: (ctx) => {
      const imgs = okPages(ctx).flatMap(contentImages);
      if (!imgs.length) return na("Картинок нет.");
      const good = imgs.filter((i) => i.alt && i.alt.trim() && !FILENAME_ALT.test(i.alt.trim())).length;
      const share = Math.round((good / imgs.length) * 100);
      return share >= 90 ? pass(`Осмысленный alt у ${share}% картинок.`) : fail(`Осмысленный alt только у ${share}% картинок.`, okPages(ctx).filter((p) => contentImages(p).some((i) => !i.alt?.trim())).map((p) => p.url));
    },
  },
  {
    id: "no-empty-headings",
    category: "content",
    severity: "advice",
    title: "Нет пустых заголовков",
    explain: "Пустой тег заголовка остаётся от вёрстки и ничего не сообщает.",
    recommendation: "Удалите пустые H1–H6 или заполните их. Для отступов используйте стили.",
    run: (ctx) => perPage(ctx, (p) => p.headings.some((h) => !h.text), (n) => `Страниц с пустыми заголовками: ${n}.`, "Пустых заголовков нет."),
  },
  {
    id: "text-to-html-ratio",
    category: "content",
    severity: "advice",
    title: "Доля текста в коде не ниже 10%",
    explain: "Когда на килобайт разметки приходится пара строк текста, страница грузится дольше, а пользы в ней мало.",
    recommendation: "Вынесите встроенные скрипты и стили в отдельные файлы и добавьте текста.",
    run: (ctx) => perPage(ctx, (p) => p.html.length > 0 && p.text.length / p.html.length < 0.1, (n) => `Страниц с долей текста ниже 10%: ${n}.`, "Доля текста в норме."),
  },
  {
    id: "external-links-have-rel",
    category: "content",
    severity: "advice",
    title: "У внешних ссылок задан rel",
    explain: "Ссылка наружу без rel передаёт вес чужому сайту, а в новой вкладке без noopener ещё и небезопасна.",
    recommendation: 'Добавьте внешним ссылкам rel="noopener", рекламным и пользовательским — ещё nofollow или sponsored.',
    run: (ctx) => perPage(ctx, (p) => p.links.some((l) => l.abs && !l.internal && !l.rel), (n) => `Страниц с внешними ссылками без rel: ${n}.`, "У внешних ссылок задан rel."),
  },
  {
    id: "internal-links-per-page",
    category: "content",
    severity: "advice",
    title: "На каждой странице от 3 внутренних ссылок",
    explain: "Внутренние ссылки ведут посетителя дальше и передают вес. Страница без ссылок — тупик.",
    recommendation: "Добавьте в текст и в блок «Смотрите также» ссылки на смежные разделы.",
    run: (ctx) => perPage(ctx, (p) => p.links.filter((l) => l.internal).length < 3, (n) => `Страниц меньше чем с 3 внутренними ссылками: ${n}.`, "Внутренних ссылок достаточно."),
  },
  {
    id: "image-dimensions-declared",
    category: "content",
    severity: "advice",
    title: "У картинок заданы width и height",
    explain: "Без размеров вёрстка прыгает при загрузке, и поиск снижает оценку удобства.",
    recommendation: "Проставьте картинкам width и height или aspect-ratio в стилях.",
    run: (ctx) =>
      perPage(ctx, (p) => contentImages(p).some((i) => (!i.width || !i.height) && !i.hasAspectRatio), (n) => `Страниц с картинками без размеров: ${n}.`, "У картинок заданы размеры."),
  },
  {
    id: "image-modern-format",
    category: "content",
    severity: "advice",
    title: "Картинки в WebP или AVIF",
    explain: "WebP и AVIF весят в 2–3 раза меньше JPEG при том же качестве.",
    recommendation: "Пересохраните фотографии в WebP. Для старых браузеров можно оставить JPEG через <picture>.",
    run: (ctx) => {
      const raster = [...ctx.images.values()].filter((i) => i.status === 200 && (/image\/(jpeg|png|gif|webp|avif|bmp)/i.test(i.contentType) || RASTER.test(i.url)));
      if (!raster.length) return na("Растровых картинок нет.");
      const old = raster.filter((i) => !/webp|avif/i.test(i.contentType) && !/\.(webp|avif)(\?|$)/i.test(i.url));
      const share = Math.round(((raster.length - old.length) / raster.length) * 100);
      return share >= 50 ? pass(`В современных форматах ${share}% картинок.`) : fail(`В WebP или AVIF только ${share}% картинок.`, old.map((i) => i.url));
    },
  },
];
