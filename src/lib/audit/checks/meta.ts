import type { CheckDef, PageData, SiteContext } from "../types";
import { fail, okPages, pass, perPage } from "./util";

const norm = (s: string | null) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

function duplicates(ctx: SiteContext, pick: (p: PageData) => string | null): string[] {
  const groups = new Map<string, string[]>();
  for (const p of okPages(ctx)) {
    const v = norm(pick(p));
    if (!v) continue;
    groups.set(v, [...(groups.get(v) || []), p.url]);
  }
  return [...groups.values()].filter((g) => g.length > 1).flat();
}

const PLACEHOLDER_TITLE = /^(главная|главная страница|home|homepage|untitled|без названия|новая страница|document|page|index|welcome|my site|мой сайт|test|тест)$/i;
const GENERIC_DESC = /(добро пожаловать|welcome to|just another|описание сайта|описание страницы|lorem ipsum|официальный сайт\.?$)/i;

export const metaChecks: CheckDef[] = [
  {
    id: "title-present",
    category: "meta",
    severity: "critical",
    title: "Title заполнен на всех страницах",
    explain: "Title — это ссылка в результатах поиска. Без него у страницы почти нет шансов на переход.",
    recommendation: "Добавьте каждой странице уникальный <title> с названием услуги или раздела и городом, если работаете локально.",
    run: (ctx) => perPage(ctx, (p) => !p.title, (n) => `Страниц без title: ${n}.`, "Title есть на всех страницах."),
  },
  {
    id: "title-not-default-placeholder",
    category: "meta",
    severity: "critical",
    title: "В title нет заглушек вроде «Главная»",
    explain: "Служебная заглушка в заголовке показывает, что страницу не заполнили.",
    recommendation: "Замените заглушки на осмысленные заголовки: что за страница, что предлагаете и где работаете.",
    run: (ctx) => perPage(ctx, (p) => !!p.title && PLACEHOLDER_TITLE.test(p.title.trim()), (n) => `Страниц с заглушкой в title: ${n}.`, "Заглушек в title нет."),
  },
  {
    id: "h1-present",
    category: "meta",
    severity: "critical",
    title: "На странице есть заголовок H1",
    explain: "По H1 и человек, и поисковик за секунду понимают, о чём страница.",
    recommendation: "Добавьте на каждую страницу один заголовок <h1> с названием услуги или темы.",
    run: (ctx) => perPage(ctx, (p) => p.h1.length === 0, (n) => `Страниц без H1: ${n}.`, "H1 есть на всех страницах."),
  },
  {
    id: "title-unique-across-site",
    category: "meta",
    severity: "important",
    title: "Title не повторяются на разных страницах",
    explain: "Одинаковые заголовки мешают поисковику понять, чем страницы отличаются.",
    recommendation: "Перепишите повторяющиеся title так, чтобы каждый описывал свою страницу.",
    run: (ctx) => {
      const d = duplicates(ctx, (p) => p.title);
      return d.length ? fail(`Страниц с повторяющимся title: ${d.length}.`, d) : pass("Все title уникальны.");
    },
  },
  {
    id: "title-length-range",
    category: "meta",
    severity: "important",
    title: "Длина title 30–65 символов",
    explain: "Короткий заголовок не раскрывает суть, длинный обрезается в выдаче многоточием.",
    recommendation: "Уложите каждый title в 30–65 символов, главное ставьте в начало.",
    run: (ctx) =>
      perPage(
        ctx,
        (p) => !!p.title && (p.title.length < 30 || p.title.length > 65),
        (n) => `Страниц с title неподходящей длины: ${n}.`,
        "Длина всех title в норме.",
        okPages(ctx).filter((p) => p.title),
      ),
  },
  {
    id: "title-no-keyword-stuffing",
    category: "meta",
    severity: "important",
    title: "В title нет повторов одного слова",
    explain: "Одно слово несколько раз подряд поисковики считают спамом.",
    recommendation: "Оставьте ключевое слово в title один раз, остальное напишите обычным языком.",
    run: (ctx) =>
      perPage(
        ctx,
        (p) => {
          const counts = new Map<string, number>();
          for (const w of norm(p.title).split(/[^\p{L}\d]+/u).filter((x) => x.length >= 4)) counts.set(w, (counts.get(w) || 0) + 1);
          return [...counts.values()].some((c) => c >= 3);
        },
        (n) => `Страниц с повторами слов в title: ${n}.`,
        "Повторов слов в title нет.",
      ),
  },
  {
    id: "description-present",
    category: "meta",
    severity: "important",
    title: "Meta description заполнен",
    explain: "Описание — это текст под ссылкой в выдаче. Оно сильно влияет на число переходов.",
    recommendation: 'Добавьте каждой странице <meta name="description"> с одним-двумя предложениями о пользе для клиента.',
    run: (ctx) => perPage(ctx, (p) => !p.description, (n) => `Страниц без description: ${n}.`, "Description есть на всех страницах."),
  },
  {
    id: "description-unique-across-site",
    category: "meta",
    severity: "important",
    title: "Description не повторяются",
    explain: "Одинаковое описание на всех страницах поисковик часто заменяет своим текстом.",
    recommendation: "Напишите отдельное описание для каждой важной страницы.",
    run: (ctx) => {
      const d = duplicates(ctx, (p) => p.description);
      return d.length ? fail(`Страниц с повторяющимся description: ${d.length}.`, d) : pass("Все description уникальны.");
    },
  },
  {
    id: "h1-single",
    category: "meta",
    severity: "important",
    title: "H1 на странице ровно один",
    explain: "Несколько H1 размывают главную мысль: непонятно, какой заголовок основной.",
    recommendation: "Оставьте один H1, остальные понизьте до H2 и H3.",
    run: (ctx) => perPage(ctx, (p) => p.h1.length > 1, (n) => `Страниц с несколькими H1: ${n}.`, "На каждой странице один H1."),
  },
  {
    id: "h1-not-empty",
    category: "meta",
    severity: "important",
    title: "H1 не пустой",
    explain: "Пустой H1 (например, только с картинкой) для поисковика равен отсутствию заголовка.",
    recommendation: "Впишите в H1 текст. Если в шапке логотип-картинка, вынесите текстовый заголовок в содержание.",
    run: (ctx) => perPage(ctx, (p) => p.h1.length > 0 && p.h1.every((h) => !h), (n) => `Страниц с пустым H1: ${n}.`, "Пустых H1 нет."),
  },
  {
    id: "html-lang-attribute",
    category: "meta",
    severity: "important",
    title: "У страницы указан язык (lang)",
    explain: "Атрибут lang подсказывает поисковику и экранным дикторам язык текста.",
    recommendation: 'Пропишите в теге <html> атрибут языка: <html lang="ru">.',
    run: (ctx) => perPage(ctx, (p) => !p.lang, (n) => `Страниц без lang: ${n}.`, "Язык страниц указан."),
  },
  {
    id: "title-not-duplicate-of-h1",
    category: "meta",
    severity: "advice",
    title: "Title не повторяет H1 дословно",
    explain: "Title продаёт переход из выдачи, H1 объясняет содержание на странице. Это разные задачи.",
    recommendation: "Сделайте title подробнее H1: добавьте город, выгоду или уточнение услуги.",
    run: (ctx) =>
      perPage(ctx, (p) => !!p.title && p.h1.some((h) => norm(h) === norm(p.title)), (n) => `Страниц, где title совпадает с H1: ${n}.`, "Title и H1 различаются."),
  },
  {
    id: "description-length-range",
    category: "meta",
    severity: "advice",
    title: "Длина description 70–160 символов",
    explain: "Короткое описание не успевает заинтересовать, длинное обрезается на середине фразы.",
    recommendation: "Уложите описание в 70–160 символов и закончите мысль или призывом.",
    run: (ctx) =>
      perPage(
        ctx,
        (p) => !!p.description && (p.description.length < 70 || p.description.length > 160),
        (n) => `Страниц с description неподходящей длины: ${n}.`,
        "Длина всех description в норме.",
        okPages(ctx).filter((p) => p.description),
      ),
  },
  {
    id: "description-not-generic",
    category: "meta",
    severity: "advice",
    title: "Description содержательный, а не дежурная фраза",
    explain: "«Добро пожаловать на наш сайт» ничего не говорит о вашей услуге.",
    recommendation: "Напишите конкретику: что делаете, для кого, где и что получит клиент.",
    run: (ctx) => perPage(ctx, (p) => !!p.description && GENERIC_DESC.test(p.description), (n) => `Страниц с дежурным описанием: ${n}.`, "Описания содержательные."),
  },
  {
    id: "h1-length-range",
    category: "meta",
    severity: "advice",
    title: "Длина H1 3–70 символов",
    explain: "Слишком длинный H1 читается как абзац, слишком короткий ничего не объясняет.",
    recommendation: "Сформулируйте H1 в 3–70 символов: коротко и по делу.",
    run: (ctx) =>
      perPage(ctx, (p) => p.h1.some((h) => !!h && (h.length < 3 || h.length > 70)), (n) => `Страниц с H1 неподходящей длины: ${n}.`, "Длина H1 в норме."),
  },
  {
    id: "meta-keywords-not-overused",
    category: "meta",
    severity: "advice",
    title: "Meta keywords не забит словами",
    explain: "Поисковики не учитывают keywords, а длинный список выглядит как попытка накрутки.",
    recommendation: 'Удалите <meta name="keywords"> или оставьте в нём не больше 5–7 слов.',
    run: (ctx) =>
      perPage(ctx, (p) => (p.keywordsMeta || "").split(/[,;]/).filter((x) => x.trim()).length > 10, (n) => `Страниц с перегруженным keywords: ${n}.`, "Keywords не перегружен."),
  },
];
