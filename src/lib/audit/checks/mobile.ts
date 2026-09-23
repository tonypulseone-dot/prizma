import type { CheckDef, PageData, SiteContext } from "../types";
import { fail, na, okPages, pass, perPage } from "./util";

/** Drops desktop-only rules (@media with min-width) so they do not count as mobile problems. */
export function stripDesktopMedia(css: string): string {
  let out = "";
  let i = 0;
  const re = /@media[^{]*min-width[^{]*\{/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    out += css.slice(i, m.index);
    let depth = 1;
    let j = m.index + m[0].length;
    while (j < css.length && depth > 0) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") depth--;
      j++;
    }
    i = j;
    re.lastIndex = j;
  }
  return out + css.slice(i);
}

const FIXED_WIDTH = /(?:^|[;{\s])width\s*:\s*(\d{3,5})px/gi;
const TINY_FONT = /font-size\s*:\s*(\d+(?:\.\d+)?)px/gi;

function maxFixedWidth(css: string): number {
  let max = 0;
  for (const m of stripDesktopMedia(css).matchAll(FIXED_WIDTH)) max = Math.max(max, Number(m[1]));
  return max;
}

function hasTinyFont(css: string): boolean {
  for (const m of css.matchAll(TINY_FONT)) {
    const v = Number(m[1]);
    if (v > 0 && v < 12) return true;
  }
  return false;
}

const pageCss = (ctx: SiteContext, p: PageData) => p.styles + (p === ctx.home ? "\n" + ctx.cssText : "");

export const mobileChecks: CheckDef[] = [
  {
    id: "viewport-meta-present",
    category: "mobile",
    severity: "critical",
    title: "Объявлен мета-тег viewport",
    explain: "Без viewport телефон показывает уменьшенную копию десктопа: текст мелкий, кнопки не нажать.",
    recommendation: 'Добавьте в <head> строку <meta name="viewport" content="width=device-width, initial-scale=1">.',
    run: (ctx) => perPage(ctx, (p) => !p.viewport, (n) => `Страниц без viewport: ${n}.`, "Viewport объявлен."),
  },
  {
    id: "viewport-allows-zoom",
    category: "mobile",
    severity: "important",
    title: "Масштабирование пальцами не запрещено",
    explain: "Запрет масштабирования мешает людям со слабым зрением и считается ошибкой доступности.",
    recommendation: "Уберите из viewport user-scalable=no и maximum-scale=1.",
    run: (ctx) => perPage(ctx, (p) => /user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/i.test(p.viewport || ""), (n) => `Страниц с запретом масштабирования: ${n}.`, "Масштабирование разрешено."),
  },
  {
    id: "viewport-width-device-width",
    category: "mobile",
    severity: "important",
    title: "В viewport указано width=device-width",
    explain: "Только device-width подстраивает страницу под реальную ширину телефона.",
    recommendation: "Приведите viewport к виду width=device-width, initial-scale=1.",
    run: (ctx) => perPage(ctx, (p) => !!p.viewport && !/width\s*=\s*device-width/i.test(p.viewport), (n) => `Страниц без width=device-width: ${n}.`, "Viewport настроен на ширину устройства.", okPages(ctx).filter((p) => p.viewport)),
  },
  {
    id: "no-fixed-pixel-width-wrapper",
    category: "mobile",
    severity: "important",
    title: "Нет жёстких ширин шире экрана телефона",
    explain: "Блок шириной 960 пикселей не сжимается на телефоне: появляется горизонтальная прокрутка.",
    recommendation: "Замените фиксированные ширины на max-width со 100% ширины: max-width: 1200px; width: 100%.",
    run: (ctx) => perPage(ctx, (p) => maxFixedWidth(pageCss(ctx, p)) > 480, (n) => `Страниц с жёсткой шириной больше 480 пикселей: ${n}.`, "Жёстких широких блоков нет."),
  },
  {
    id: "no-flash-or-applet",
    category: "mobile",
    severity: "important",
    title: "Нет Flash и Java-апплетов",
    explain: "Flash и апплеты не работают ни в одном современном браузере.",
    recommendation: "Замените object/embed/applet на видео <video> или обычную вёрстку.",
    run: (ctx) => perPage(ctx, (p) => p.$("applet, object[type*='flash'], embed[src$='.swf'], object[data$='.swf']").length > 0, (n) => `Страниц с Flash или апплетами: ${n}.`, "Устаревших плагинов нет."),
  },
  {
    id: "responsive-images-srcset",
    category: "mobile",
    severity: "advice",
    title: "Картинки отдаются в нескольких размерах (srcset)",
    explain: "Без srcset телефон грузит ту же большую картинку, что и компьютер.",
    recommendation: "Подготовьте картинкам 2–3 размера и перечислите их в srcset с шириной.",
    run: (ctx) => {
      const pages = okPages(ctx).filter((p) => p.images.some((i) => i.src && !/\.svg(\?|$)/i.test(i.src)));
      if (!pages.length) return na("Растровых картинок нет.");
      return perPage(ctx, (p) => p.images.some((i) => i.src && !/\.svg(\?|$)/i.test(i.src) && !i.srcset && !i.inPicture), (n) => `Страниц с картинками без srcset: ${n}.`, "Картинки отдаются в нескольких размерах.", pages);
    },
  },
  {
    id: "font-size-not-tiny",
    category: "mobile",
    severity: "advice",
    title: "Нет текста мельче 12 пикселей",
    explain: "Мелкий текст на телефоне приходится увеличивать пальцами.",
    recommendation: "Задайте основному тексту от 16 пикселей, подписям — не меньше 12.",
    run: (ctx) => perPage(ctx, (p) => hasTinyFont(pageCss(ctx, p)), (n) => `Страниц с текстом мельче 12 пикселей: ${n}.`, "Слишком мелкого текста нет."),
  },
  {
    id: "apple-touch-icon-present",
    category: "mobile",
    severity: "advice",
    title: "Есть иконка для экрана телефона",
    explain: "Без apple-touch-icon сайт на главном экране телефона будет безликим квадратом.",
    recommendation: 'Подключите картинку 180×180 строкой <link rel="apple-touch-icon" href="/apple-touch-icon.png">.',
    run: (ctx) => (ctx.home.$('link[rel*="apple-touch-icon" i]').length ? pass("apple-touch-icon объявлен.") : fail("apple-touch-icon не объявлен.", [ctx.home.url])),
  },
  {
    id: "theme-color-present",
    category: "mobile",
    severity: "advice",
    title: "Задан фирменный цвет (theme-color)",
    explain: "Мобильные браузеры красят строку адреса в этот цвет — мелочь, которая делает сайт аккуратнее.",
    recommendation: 'Добавьте <meta name="theme-color" content="#123456"> с цветом бренда.',
    run: (ctx) => (ctx.home.$('meta[name="theme-color" i]').length ? pass("theme-color задан.") : fail("theme-color не задан.", [ctx.home.url])),
  },
  {
    id: "no-horizontal-overflow-hint",
    category: "mobile",
    severity: "advice",
    title: "Нет признаков горизонтальной прокрутки",
    explain: "Горизонтальная прокрутка — частый признак неадаптивной вёрстки.",
    recommendation: "Задайте блокам и картинкам max-width: 100%, а таблицы оберните в контейнер с прокруткой.",
    run: (ctx) => {
      const imgFluid = /img[^{]*\{[^}]*max-width\s*:\s*100%/i.test(ctx.cssText + ctx.home.styles);
      return perPage(
        ctx,
        (p) => {
          const $ = p.$;
          const bareTable = $("table").toArray().some((t) => !$(t).parents().toArray().some((el) => /overflow|scroll|table-responsive|table-wrap/i.test(`${$(el).attr("class") || ""} ${$(el).attr("style") || ""}`)));
          const wideImg = !imgFluid && p.images.some((i) => Number(i.width) > 480);
          return bareTable || wideImg || maxFixedWidth(pageCss(ctx, p)) > 480;
        },
        (n) => `Страниц с признаками выхода содержимого за экран: ${n}.`,
        "Признаков горизонтальной прокрутки нет.",
      );
    },
  },
];
