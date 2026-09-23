import type { CheckDef, PageData } from "../types";
import { fail, na, okPages, pass, perPage } from "./util";

const types = (pages: PageData[]) => new Set(pages.flatMap((p) => p.jsonld.flatMap((b) => b.types)));
const ORG = /^(Organization|LocalBusiness|Corporation|.*Business|Store|Restaurant|Dentist|MedicalClinic|MedicalOrganization|AutoRepair|LegalService|RealEstateAgent|EducationalOrganization|HealthAndBeautyBusiness|ProfessionalService|HomeAndConstructionBusiness|FinancialService|Hotel|FoodEstablishment|Physician|Hospital|Pharmacy|SportsActivityLocation)$/;

function metaCheck(id: string, sev: "important" | "advice", prop: string, source: "og" | "twitter", title: string, explain: string, recommendation: string, allPages: boolean): CheckDef {
  return {
    id,
    category: "markup",
    severity: sev,
    title,
    explain,
    recommendation,
    run: (ctx) =>
      perPage(
        ctx,
        (p) => !p[source][prop],
        (n) => `Страниц без ${prop}: ${n}.`,
        `${prop} задан.`,
        allPages ? okPages(ctx) : [ctx.home],
      ),
  };
}

export const markupChecks: CheckDef[] = [
  {
    id: "jsonld-present",
    category: "markup",
    severity: "important",
    title: "Есть микроразметка Schema.org (JSON-LD)",
    explain: "Микроразметка объясняет поиску, что за компания стоит за сайтом, где она и как с ней связаться.",
    recommendation: 'Добавьте в <head> блок <script type="application/ld+json"> с названием, телефоном, адресом и часами работы.',
    run: (ctx) => {
      const n = okPages(ctx).filter((p) => p.jsonld.length).length;
      return n ? pass(`JSON-LD есть на ${n} страницах.`) : fail("JSON-LD нет ни на одной странице.", [ctx.home.url]);
    },
  },
  {
    id: "jsonld-valid",
    category: "markup",
    severity: "important",
    title: "Микроразметка без синтаксических ошибок",
    explain: "Сломанный JSON-LD поиск просто игнорирует.",
    recommendation: "Проверьте разметку валидатором Schema.org и уберите лишние запятые и незакрытые скобки.",
    run: (ctx) => {
      const pages = okPages(ctx).filter((p) => p.jsonld.length);
      if (!pages.length) return na("Микроразметки нет.");
      return perPage(ctx, (p) => p.jsonld.some((b) => !!b.error), (n) => `Страниц с ошибками в JSON-LD: ${n}.`, "Микроразметка разбирается без ошибок.", pages);
    },
  },
  {
    id: "schema-organization-or-localbusiness",
    category: "markup",
    severity: "important",
    title: "Описана организация",
    explain: "Разметка Organization или LocalBusiness связывает сайт с карточкой компании: название, телефон и адрес.",
    recommendation: "Добавьте разметку LocalBusiness (если есть адрес) или Organization с полями name, telephone, address и url.",
    run: (ctx) => {
      const found = [...types(okPages(ctx))].filter((t) => ORG.test(t));
      return found.length ? pass(`Найдено: ${found.join(", ")}.`) : fail("Разметки организации нет.", [ctx.home.url]);
    },
  },
  metaCheck("og-title-present", "important", "og:title", "og", "Задан заголовок для соцсетей (og:title)", "Без og:title ссылка в мессенджере выглядит голым адресом.", 'Добавьте <meta property="og:title" content="…"> с понятным заголовком.', true),
  metaCheck("og-description-present", "important", "og:description", "og", "Задано описание для соцсетей (og:description)", "Описание — вторая строка карточки ссылки, она объясняет, зачем переходить.", 'Добавьте <meta property="og:description" content="…"> на 1–2 предложения.', true),
  metaCheck("og-image-present", "important", "og:image", "og", "Задана картинка для соцсетей (og:image)", "Ссылка с картинкой занимает больше места в ленте и собирает больше переходов.", 'Подготовьте картинку 1200×630 и подключите <meta property="og:image" content="…"> с полным адресом.', true),
  {
    id: "schema-breadcrumb",
    category: "markup",
    severity: "advice",
    title: "Размечены «хлебные крошки» (BreadcrumbList)",
    explain: "С этой разметкой в выдаче вместо длинного адреса видна цепочка разделов.",
    recommendation: "Разметьте навигационную цепочку схемой BreadcrumbList с позициями и адресами.",
    run: (ctx) => {
      const inner = okPages(ctx).filter((p) => p.depth >= 2);
      if (!inner.length) return na("Внутренних страниц второго уровня нет.");
      return types(inner).has("BreadcrumbList") || /BreadcrumbList/.test(inner.map((p) => p.html).join(" ")) ? pass("BreadcrumbList найден.") : fail("Разметки BreadcrumbList нет.", inner.map((p) => p.url));
    },
  },
  {
    id: "schema-website",
    category: "markup",
    severity: "advice",
    title: "Описан сам сайт (WebSite)",
    explain: "Разметка WebSite сообщает поиску название сайта.",
    recommendation: "Добавьте блок @type: WebSite с полями name и url.",
    run: (ctx) => (types(okPages(ctx)).has("WebSite") ? pass("Разметка WebSite есть.") : fail("Разметки WebSite нет.", [ctx.home.url])),
  },
  metaCheck("og-url-present", "advice", "og:url", "og", "Задан og:url", "og:url собирает все репосты страницы на один адрес.", 'Добавьте <meta property="og:url" content="…"> с каноническим адресом.', false),
  metaCheck("og-type-present", "advice", "og:type", "og", "Задан og:type", "Тип подсказывает соцсети, как показать карточку.", 'Добавьте <meta property="og:type" content="website">, для статей — "article".', false),
  metaCheck("twitter-card-present", "advice", "twitter:card", "twitter", "Задан twitter:card", "Тег читают и некоторые мессенджеры: он решает, будет ли крупная картинка.", 'Добавьте <meta name="twitter:card" content="summary_large_image">.', false),
  metaCheck("twitter-image-present", "advice", "twitter:image", "twitter", "Задана картинка карточки (twitter:image)", "Без своей картинки карточка берёт случайное изображение или остаётся пустой.", 'Добавьте <meta name="twitter:image" content="…"> — можно ту же, что в og:image.', false),
];
