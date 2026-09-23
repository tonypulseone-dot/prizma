import type { CheckDef, SiteContext } from "../types";
import { fail, header, na, okPages, pass, perPage, TRACKERS } from "./util";

const leadForms = (ctx: SiteContext) => okPages(ctx).filter((p) => p.forms.some((f) => !f.isSearch && f.personalFields > 0));
const allHtml = (ctx: SiteContext) => okPages(ctx).map((p) => p.html).join("\n");

function headerCheck(id: string, sev: "important" | "advice", name: string, title: string, explain: string, recommendation: string, test: (v: string, ctx: SiteContext) => boolean): CheckDef {
  return {
    id,
    category: "trust",
    severity: sev,
    title,
    explain,
    recommendation,
    run: (ctx) => (test(header(ctx.home.headers, name), ctx) ? pass(`Заголовок ${name} задан.`) : fail(`Заголовок ${name} не отдаётся.`, [ctx.home.url])),
  };
}

export const trustChecks: CheckDef[] = [
  {
    id: "privacy-policy-linked",
    category: "trust",
    severity: "critical",
    title: "Есть ссылка на политику обработки ПДн",
    explain: "Сайт, который собирает заявки или ставит счётчики, обязан опубликовать политику обработки персональных данных (ст. 18.1 152-ФЗ). Штраф для компании — до 300 тыс. ₽.",
    recommendation: "Опубликуйте свою политику обработки персональных данных и поставьте ссылку в подвал и рядом с каждой формой. Текст согласуйте с юристом.",
    run: (ctx) => {
      const has = okPages(ctx).some((p) => p.links.some((l) => /политик|конфиденц|персональн|privacy|policy/i.test(`${l.text} ${l.href}`)));
      return has ? pass("Ссылка на политику обработки данных есть.") : fail("Ссылки на политику обработки персональных данных нет.", [ctx.home.url]);
    },
  },
  {
    id: "forms-have-consent",
    category: "trust",
    severity: "critical",
    title: "Формы спрашивают согласие на обработку данных",
    explain: "Имя и телефон из заявки — персональные данные. Без согласия их обработка нарушает ст. 9 152-ФЗ.",
    recommendation: "Добавьте в каждую форму неотмеченный чекбокс «Даю согласие на обработку персональных данных» со ссылкой на текст согласия и политику.",
    run: (ctx) => {
      const pages = leadForms(ctx);
      if (!pages.length) return na("Форм заявок не найдено.");
      return perPage(ctx, (p) => p.forms.some((f) => !f.isSearch && f.personalFields > 0 && !f.consentCheckbox && !f.consentText), (n) => `Страниц с формами без согласия: ${n}.`, "Формы спрашивают согласие.", pages);
    },
  },
  {
    id: "consent-not-prechecked",
    category: "trust",
    severity: "important",
    title: "Галочка согласия не стоит заранее",
    explain: "Согласие, отмеченное за человека, считается недействительным.",
    recommendation: "Уберите атрибут checked у чекбоксов согласия.",
    run: (ctx) => {
      const pages = okPages(ctx).filter((p) => p.forms.some((f) => f.consentCheckbox));
      if (!pages.length) return na("Чекбоксов согласия нет.");
      return perPage(ctx, (p) => p.forms.some((f) => f.consentPrechecked), (n) => `Страниц с заранее отмеченным согласием: ${n}.`, "Согласие посетитель отмечает сам.", pages);
    },
  },
  headerCheck(
    "header-frame-protection",
    "important",
    "x-frame-options",
    "Сайт защищён от встраивания в чужие страницы",
    "Если сайт можно открыть во фрейме на чужом домене, мошенники могут заставить посетителя нажимать не то (clickjacking).",
    "Добавьте заголовок X-Frame-Options: SAMEORIGIN или frame-ancestors 'self' в Content-Security-Policy.",
    (v, ctx) => !!v || /frame-ancestors/i.test(header(ctx.home.headers, "content-security-policy")),
  ),
  {
    id: "cookie-notice-with-trackers",
    category: "trust",
    severity: "important",
    title: "Посетителя предупреждают о cookie",
    explain: "Счётчики собирают идентификаторы посетителя. Роскомнадзор считает их персональными данными, поэтому нужно уведомление.",
    recommendation: "Добавьте уведомление о cookie со ссылкой на политику. Необязательные счётчики запускайте после согласия.",
    run: (ctx) => {
      const html = allHtml(ctx);
      const trackers = [...TRACKERS.foreign, ...TRACKERS.local].filter((t) => t.re.test(html));
      if (!trackers.length) return na("Счётчиков не найдено.");
      return /cookie|куки/i.test(html) ? pass(`Счётчики (${trackers.map((t) => t.name).join(", ")}) есть, уведомление о cookie тоже.`) : fail(`Стоят счётчики (${trackers.map((t) => t.name).join(", ")}), а уведомления о cookie нет.`, [ctx.home.url]);
    },
  },
  {
    id: "a11y-form-labels",
    category: "trust",
    severity: "important",
    title: "У полей форм есть подписи",
    explain: "Подсказка внутри поля исчезает при вводе и не читается экранным диктором.",
    recommendation: "Дайте каждому полю <label for> или атрибут aria-label.",
    run: (ctx) => {
      const pages = okPages(ctx).filter((p) => p.forms.length);
      if (!pages.length) return na("Форм нет.");
      const total = pages.reduce((s, p) => s + p.forms.reduce((a, f) => a + f.unlabeledFields, 0), 0);
      return perPage(ctx, (p) => p.forms.some((f) => f.unlabeledFields > 0), () => `Полей без подписи: ${total}.`, "У всех полей есть подписи.", pages);
    },
  },
  headerCheck(
    "header-content-type-options",
    "important",
    "x-content-type-options",
    "Заголовок X-Content-Type-Options: nosniff",
    "Без него браузер может «угадать» тип файла и выполнить загруженный файл как скрипт.",
    "Добавьте заголовок X-Content-Type-Options: nosniff.",
    (v) => /nosniff/i.test(v),
  ),
  {
    id: "no-foreign-trackers",
    category: "trust",
    severity: "advice",
    title: "Счётчики не передают данные за рубеж",
    explain: "Google Analytics, Meta Pixel и похожие сервисы отправляют данные посетителей за границу. Это трансграничная передача (ст. 12 152-ФЗ).",
    recommendation: "Замените иностранные счётчики на российские или подайте уведомление о трансграничной передаче. Уточните у юриста.",
    run: (ctx) => {
      const found = TRACKERS.foreign.filter((t) => t.re.test(allHtml(ctx)));
      return found.length ? fail(`Найдены: ${found.map((t) => t.name).join(", ")}.`, [ctx.home.url]) : pass("Иностранных счётчиков не найдено.");
    },
  },
  {
    id: "forms-spam-protection",
    category: "trust",
    severity: "advice",
    title: "Формы защищены от спама",
    explain: "Без защиты боты засыпают формы спамом, менеджеры тратят время на пустые заявки.",
    recommendation: "Подключите Yandex SmartCaptcha или хотя бы скрытое поле-ловушку и ограничение частоты отправок.",
    run: (ctx) => {
      const pages = leadForms(ctx);
      if (!pages.length) return na("Форм заявок не найдено.");
      return perPage(ctx, (p) => p.forms.some((f) => !f.isSearch && f.personalFields > 0 && !f.spamProtected), (n) => `Страниц с формой без защиты: ${n}.`, "Формы защищены.", pages);
    },
  },
  {
    id: "a11y-button-names",
    category: "trust",
    severity: "advice",
    title: "У кнопок-иконок есть название",
    explain: "Кнопка только с иконкой для экранного диктора звучит как «кнопка».",
    recommendation: "Добавьте кнопкам без текста aria-label, например «Открыть меню».",
    run: (ctx) =>
      perPage(
        ctx,
        (p) => p.$("button").toArray().some((b) => !p.$(b).text().trim() && !p.$(b).attr("aria-label") && !p.$(b).attr("title") && !p.$(b).attr("aria-labelledby") && !p.$(b).find("img[alt]").filter((_, i) => !!p.$(i).attr("alt")?.trim()).length),
        (n) => `Страниц с безымянными кнопками: ${n}.`,
        "У всех кнопок есть название.",
      ),
  },
  {
    id: "a11y-main-landmark",
    category: "trust",
    severity: "advice",
    title: "Основное содержимое в теге <main>",
    explain: "<main> позволяет экранным дикторам и нейросетям сразу перейти к сути страницы.",
    recommendation: "Оберните основное содержимое каждой страницы в <main>.",
    run: (ctx) => perPage(ctx, (p) => !p.hasMain, (n, t) => `Страниц без <main>: ${n} из ${t}.`, "Тег <main> есть."),
  },
  {
    id: "a11y-no-autoplay-sound",
    category: "trust",
    severity: "advice",
    title: "Видео не включается со звуком",
    explain: "Внезапный звук пугает и мешает людям с экранным диктором.",
    recommendation: "Добавьте muted к видео с autoplay или уберите автозапуск.",
    run: (ctx) => perPage(ctx, (p) => p.$("video[autoplay]:not([muted]), audio[autoplay]").length > 0, (n) => `Страниц с автозапуском звука: ${n}.`, "Автозапуска со звуком нет."),
  },
  headerCheck(
    "header-csp-present",
    "advice",
    "content-security-policy",
    "Задана политика безопасности (CSP)",
    "Content-Security-Policy ограничивает, откуда странице можно загружать скрипты.",
    "Начните с Content-Security-Policy-Report-Only, соберите нужные источники, затем включите default-src 'self'.",
    (v, ctx) => !!v || !!header(ctx.home.headers, "content-security-policy-report-only"),
  ),
  headerCheck(
    "header-referrer-policy",
    "advice",
    "referrer-policy",
    "Задан заголовок Referrer-Policy",
    "Без него полный адрес страницы с параметрами уходит на сторонние сайты.",
    "Добавьте Referrer-Policy: strict-origin-when-cross-origin.",
    (v, ctx) => !!v || ctx.home.$('meta[name="referrer" i]').length > 0,
  ),
  headerCheck(
    "header-permissions-policy",
    "advice",
    "permissions-policy",
    "Задан заголовок Permissions-Policy",
    "Заголовок запрещает стороннему коду доступ к камере, микрофону и геолокации.",
    "Добавьте Permissions-Policy: camera=(), microphone=(), geolocation=().",
    (v) => !!v,
  ),
];
