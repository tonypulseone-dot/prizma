import { load, type CheerioAPI } from "cheerio";
import type { Element } from "domhandler";
import type { FormInfo, HttpResponse, ImageInfo, JsonLdBlock, LinkInfo, PageData } from "./types";
import { sameSite, toAbsolute } from "./url";

const collapse = (s: string) => s.replace(/\s+/g, " ").trim();

export function collectTypes(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) node.forEach((n) => collectTypes(n, out));
  else if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const t = obj["@type"];
    if (typeof t === "string") out.push(t);
    else if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && out.push(x));
    for (const [k, v] of Object.entries(obj)) if (k !== "@type" && typeof v === "object") collectTypes(v, out);
  }
  return out;
}

function parseJsonLd($: CheerioAPI): JsonLdBlock[] {
  return $('script[type="application/ld+json"]')
    .map((_, el) => {
      const raw = $(el).text().trim();
      try {
        const data = JSON.parse(raw);
        return { raw, data, types: collectTypes(data) } as JsonLdBlock;
      } catch (e) {
        return { raw, data: null, error: (e as Error).message, types: [] } as JsonLdBlock;
      }
    })
    .get();
}

function hasLabel($: CheerioAPI, el: Element): boolean {
  const $el = $(el);
  if ($el.attr("aria-label")?.trim() || $el.attr("aria-labelledby") || $el.attr("title")?.trim()) return true;
  if ($el.closest("label").length) return true;
  const id = $el.attr("id");
  return !!id && $(`label[for="${id.replace(/"/g, '\\"')}"]`).length > 0;
}

const CONSENT_RE = /(соглас|персональн|обработк\w* данных|политик\w* конфиденц|consent|privacy)/i;
const PERSONAL_RE = /(name|имя|фио|phone|tel|телефон|mail|почт|contact|fio)/i;
const CAPTCHA_RE = /(smartcaptcha|captcha|recaptcha|hcaptcha|turnstile|honeypot|hp-field|cf-turnstile)/i;

function parseForms($: CheerioAPI): FormInfo[] {
  return $("form")
    .map((_, form) => {
      const $f = $(form);
      const fields = $f
        .find("input, textarea, select")
        .toArray()
        .filter((el) => {
          const type = ($(el).attr("type") || "text").toLowerCase();
          return !["hidden", "submit", "button", "image", "reset"].includes(type);
        });
      const textFields = fields.filter((el) => !["checkbox", "radio"].includes(($(el).attr("type") || "").toLowerCase()));
      const isSearch =
        $f.attr("role") === "search" ||
        /search|поиск/i.test($f.attr("action") || "") ||
        (textFields.length <= 1 && textFields.some((el) => /^(q|s|search|query|text)$/i.test($(el).attr("name") || "") || $(el).attr("type") === "search"));
      const personalFields = textFields.filter((el) => {
        const $el = $(el);
        const type = ($el.attr("type") || "").toLowerCase();
        return type === "tel" || type === "email" || PERSONAL_RE.test(`${$el.attr("name") || ""} ${$el.attr("placeholder") || ""} ${$el.attr("id") || ""}`);
      }).length;
      const checkboxes = $f.find('input[type="checkbox"]').toArray();
      const consentBoxes = checkboxes.filter((cb) => {
        const $cb = $(cb);
        const id = $cb.attr("id");
        const labelText = [$cb.closest("label").text(), id ? $(`label[for="${id}"]`).text() : "", $cb.parent().text(), $cb.attr("name") || ""].join(" ");
        return CONSENT_RE.test(labelText);
      });
      const formHtml = $.html(form);
      return {
        isSearch,
        personalFields,
        unlabeledFields: fields.filter((el) => !hasLabel($, el)).length,
        consentCheckbox: consentBoxes.length > 0,
        consentPrechecked: consentBoxes.some((cb) => $(cb).is("[checked]")),
        consentText: CONSENT_RE.test(collapse($f.text())),
        spamProtected: CAPTCHA_RE.test(formHtml) || /name=["'](website|hp|honeypot|url_confirm)["']/i.test(formHtml),
      } satisfies FormInfo;
    })
    .get();
}

export function parsePage(res: HttpResponse, siteHost: string): PageData {
  const $ = load(res.body);
  const pageUrl = res.url;
  const meta = (name: string) => $(`meta[name="${name}" i]`).attr("content")?.trim() ?? null;

  const og: Record<string, string> = {};
  $('meta[property^="og:"]').each((_, el) => {
    og[($(el).attr("property") || "").toLowerCase()] = ($(el).attr("content") || "").trim();
  });
  const twitter: Record<string, string> = {};
  $('meta[name^="twitter:"], meta[property^="twitter:"]').each((_, el) => {
    const k = ($(el).attr("name") || $(el).attr("property") || "").toLowerCase();
    twitter[k] = ($(el).attr("content") || "").trim();
  });

  const links: LinkInfo[] = $("a[href]")
    .map((_, el) => {
      const $a = $(el);
      const href = ($a.attr("href") || "").trim();
      const abs = toAbsolute(href, pageUrl);
      let internal = false;
      if (abs) internal = sameSite(new URL(abs).hostname, siteHost);
      return {
        href,
        abs,
        text: collapse($a.text()),
        rel: ($a.attr("rel") || "").toLowerCase(),
        internal,
        ariaLabel: ($a.attr("aria-label") || $a.attr("title") || "").trim(),
        hasImgAlt: $a.find("img[alt]").toArray().some((img) => !!$(img).attr("alt")?.trim()),
        inNav: $a.closest("nav, header, [role=navigation]").length > 0,
        target: ($a.attr("target") || "").toLowerCase(),
      };
    })
    .get();

  const images: ImageInfo[] = $("img")
    .map((_, el) => {
      const $i = $(el);
      const src = ($i.attr("src") || $i.attr("data-src") || "").trim();
      return {
        src,
        abs: src && !src.startsWith("data:") ? toAbsolute(src, pageUrl) : null,
        alt: $i.attr("alt") ?? null,
        width: $i.attr("width") ?? null,
        height: $i.attr("height") ?? null,
        srcset: $i.attr("srcset") || $i.attr("data-srcset") || null,
        inPicture: $i.parent("picture").find("source[srcset]").length > 0,
        hasAspectRatio: /aspect-ratio/i.test($i.attr("style") || ""),
      };
    })
    .get();

  const headings = $("h1, h2, h3, h4, h5, h6")
    .map((_, el) => ({ level: Number(el.tagName.slice(1)), text: collapse($(el).text()) }))
    .get();

  const styles = [
    ...$("style").map((_, el) => $(el).text()).get(),
    ...$("[style]").map((_, el) => `x{${$(el).attr("style")}}`).get(),
  ].join("\n");

  const scripts = $("script[src]").map((_, el) => toAbsolute($(el).attr("src") || "", pageUrl) || "").get().filter(Boolean);
  const inlineScriptsBytes = $("script:not([src])").map((_, el) => $(el).text().length).get().reduce((a, b) => a + b, 0);
  const jsonld = parseJsonLd($);

  // Visible text: drop code and non-content nodes on a copy.
  const $text = load(res.body);
  $text("script, style, noscript, svg, template, iframe").remove();
  const text = collapse($text("body").text());
  const $content = $text("main").length ? $text("main").first() : $text("body");
  $content.find("header, nav, footer").remove();
  const topText = collapse($content.text()).slice(0, 1500);
  const words = text ? text.split(" ").filter((w) => /[\p{L}\d]/u.test(w)).length : 0;

  let depth = 0;
  try {
    depth = new URL(pageUrl).pathname.split("/").filter(Boolean).length;
  } catch {
    /* keep 0 */
  }

  return {
    url: pageUrl,
    status: res.status,
    headers: res.headers,
    html: res.body,
    bytes: res.bytes,
    ttfbMs: res.ttfbMs,
    $,
    title: $("head title").first().text().trim() || $("title").first().text().trim() || null,
    titleCount: $("title").length,
    description: meta("description"),
    keywordsMeta: meta("keywords"),
    metaRobots: [meta("robots"), meta("yandex"), meta("googlebot")].filter(Boolean).join(",").toLowerCase(),
    metaCharset: $("meta[charset]").attr("charset")?.toLowerCase() ?? (/charset=([\w-]+)/i.exec($('meta[http-equiv="content-type" i]').attr("content") || "")?.[1]?.toLowerCase() ?? null),
    lang: $("html").attr("lang")?.trim() || null,
    viewport: meta("viewport"),
    canonicals: $('link[rel="canonical" i]').map((_, el) => ($(el).attr("href") || "").trim()).get(),
    h1: $("h1").map((_, el) => collapse($(el).text())).get(),
    headings,
    og,
    twitter,
    jsonld,
    links,
    images,
    forms: parseForms($),
    text,
    topText,
    words,
    styles,
    scripts,
    inlineScriptsBytes,
    hasMain: $("main, [role=main]").length > 0,
    hasBreadcrumbs:
      $('[aria-label*="breadcrumb" i], [class*="breadcrumb" i], [itemtype*="BreadcrumbList"], [class*="crumbs" i]').length > 0 ||
      jsonld.some((b) => b.types.includes("BreadcrumbList")),
    depth,
  };
}
