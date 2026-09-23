import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runChecks, REGISTRY } from "@/lib/audit/checks";
import { buildContext } from "@/lib/audit/crawl";
import { extractKeywords } from "@/lib/audit/keywords";
import { isAllowed, parseRobots } from "@/lib/audit/robots";
import { scoreResults, summarizePages } from "@/lib/audit/score";
import type { CheckResult, SiteContext } from "@/lib/audit/types";
import { InputError, normalizeInputUrl } from "@/lib/audit/url";
import { startFixtureSite } from "./fixture-site";

describe("registry", () => {
  it("has 127 unique checks across 9 categories", () => {
    expect(REGISTRY).toHaveLength(127);
    expect(new Set(REGISTRY.map((c) => c.id)).size).toBe(127);
    expect(new Set(REGISTRY.map((c) => c.category)).size).toBe(9);
  });
});

describe("normalizeInputUrl", () => {
  it("adds https and converts Cyrillic domains to punycode", () => {
    expect(normalizeInputUrl("вебпоиск.рф/seo-audit")).toBe("https://xn--90abjnkwgs.xn--p1ai/");
    expect(normalizeInputUrl("http://Example.com/path?q=1")).toBe("http://example.com/");
  });
  it("rejects private and malformed input", () => {
    expect(() => normalizeInputUrl("localhost")).toThrow(InputError);
    expect(() => normalizeInputUrl("http://10.0.0.1/")).toThrow(InputError);
    expect(() => normalizeInputUrl("ftp://example.com")).toThrow(InputError);
    expect(() => normalizeInputUrl("")).toThrow(InputError);
  });
});

describe("robots.txt", () => {
  const r = parseRobots("User-agent: *\nDisallow: /admin/\nAllow: /admin/public\n\nUser-agent: GPTBot\nDisallow: /\n", 200, "text/plain");
  it("applies longest-match rules per agent", () => {
    expect(isAllowed(r, "Googlebot", "/")).toBe(true);
    expect(isAllowed(r, "Googlebot", "/admin/x")).toBe(false);
    expect(isAllowed(r, "Googlebot", "/admin/public/page")).toBe(true);
    expect(isAllowed(r, "GPTBot", "/")).toBe(false);
  });
});

describe("audit of the fixture site", () => {
  let site: Awaited<ReturnType<typeof startFixtureSite>>;
  let ctx: SiteContext;
  let results: CheckResult[];
  const byId = (id: string) => results.find((r) => r.checkId === id)!;

  beforeAll(async () => {
    process.env.AUDIT_ALLOW_PRIVATE_HOSTS = "1";
    site = await startFixtureSite();
    ctx = await buildContext(site.origin, () => {}, 20);
    results = runChecks(ctx);
  });
  afterAll(() => site?.close());

  it("crawls the linked pages and follows the sitemap", () => {
    const paths = ctx.pages.map((p) => new URL(p.url).pathname).sort();
    expect(paths).toEqual(["/", "/about/", "/privacy/", "/services/", "/services/remont/kvartiry/"]);
  });

  it("returns an outcome for every check", () => {
    expect(results).toHaveLength(127);
    for (const r of results) expect(["passed", "failed", "na"]).toContain(r.status);
  });

  it.each([
    "ai-bots-allowed",
    "no-broken-internal-links",
    "no-links-to-redirects",
    "forms-have-consent",
    "a11y-form-labels",
    "image-weight-limit",
    "title-length-range",
    "title-unique-across-site",
    "heading-hierarchy-no-skip",
    "alt-not-just-filename",
    "external-links-have-rel",
    "no-server-version-disclosure",
    "no-fixed-pixel-width-wrapper",
    "breadcrumbs-present",
    "sitemap-covers-crawled-pages",
    "og-image-present",
    "https-enabled",
    "404-page-is-custom",
  ])("flags %s", (id) => {
    expect(byId(id).status).toBe("failed");
  });

  it.each([
    "homepage-status-200",
    "robots-txt-exists",
    "robots-declares-sitemap",
    "sitemap-exists",
    "sitemap-valid-xml",
    "404-returns-404-code",
    "charset-utf8",
    "viewport-meta-present",
    "h1-present",
    "ai-prices-in-text",
    "ai-faq-block",
    "ai-machine-structure",
    "ai-answer-on-top",
    "schema-organization-or-localbusiness",
    "privacy-policy-linked",
    "contacts-present-on-site",
    "no-placeholder-text",
  ])("passes %s", (id) => {
    expect(byId(id).status).toBe("passed");
  });

  it("falls back to http when the site has no https", async () => {
    const httpsGuess = site.origin.replace("http://", "https://");
    const c = await buildContext(httpsGuess, () => {}, 1);
    expect(c.home.url).toBe(site.origin);
    expect(c.home.status).toBe(200);
  });

  it("points failures at the right pages", () => {
    expect(byId("no-broken-internal-links").details).toContain("missing-page");
    expect(byId("ai-bots-allowed").details).toContain("GPTBot");
    expect(byId("breadcrumbs-present").affectedUrls?.some((u) => u.endsWith("/services/remont/kvartiry/"))).toBe(true);
  });

  it("scores categories by passed weight and produces keywords", () => {
    const { score, categories } = scoreResults(results);
    expect(score).toBeGreaterThan(20);
    expect(score).toBeLessThan(95);
    expect(categories).toHaveLength(9);
    for (const c of categories) expect(c.score).toBeGreaterThanOrEqual(0);
    const pages = summarizePages(results, ctx.pages.map((p) => p.url));
    expect(pages[0].issues).toBeGreaterThan(0);
    const kw = extractKeywords(ctx.pages);
    expect(kw.words.map((w) => w.term)).toContain("ремонт");
    expect(kw.phrases.length).toBeGreaterThan(0);
  });
});

describe("SSRF protection", () => {
  it("refuses loopback and private addresses unless explicitly allowed", async () => {
    const { fetchOnce } = await import("@/lib/audit/http");
    const prev = process.env.AUDIT_ALLOW_PRIVATE_HOSTS;
    process.env.AUDIT_ALLOW_PRIVATE_HOSTS = "0";
    try {
      for (const url of ["http://127.0.0.1:9/", "http://localhost:9/", "http://10.1.2.3/", "http://[::1]:9/"]) {
        const r = await fetchOnce(url, { timeoutMs: 2000 });
        expect(r.status, url).toBe(0);
        expect(r.error, url).toMatch(/внутренн/);
      }
    } finally {
      process.env.AUDIT_ALLOW_PRIVATE_HOSTS = prev;
    }
  });
});
