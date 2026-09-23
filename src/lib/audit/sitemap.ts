import { load } from "cheerio";
import { fetchFollow } from "./http";
import type { SitemapInfo } from "./types";

const MAX_URLS = 5000;
const MAX_CHILD_SITEMAPS = 5;

function parseXml(body: string): { isXml: boolean; isIndex: boolean; locs: string[] } {
  const trimmed = body.trim();
  const isXml = /^(<\?xml|<urlset|<sitemapindex)/i.test(trimmed) && !/<html/i.test(trimmed.slice(0, 500));
  if (!isXml) return { isXml: false, isIndex: false, locs: [] };
  const $ = load(trimmed, { xml: true });
  const isIndex = $("sitemapindex").length > 0;
  const locs = $(isIndex ? "sitemap > loc" : "url > loc")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);
  return { isXml, isIndex, locs };
}

export async function loadSitemap(origin: string, declared: string[]): Promise<SitemapInfo> {
  const candidates = [...new Set([...declared, new URL("/sitemap.xml", origin).toString()])].slice(0, 3);
  for (const source of candidates) {
    const chain = await fetchFollow(source, 5, { maxBytes: 10 * 1024 * 1024 });
    const res = chain.final;
    if (res.status !== 200) {
      if (source === candidates[candidates.length - 1]) {
        return { status: res.status, found: false, isXml: false, valid: false, urls: [], source };
      }
      continue;
    }
    const parsed = parseXml(res.body);
    if (!parsed.isXml) {
      return { status: 200, found: true, isXml: false, valid: false, urls: [], source };
    }
    let urls = parsed.locs;
    if (parsed.isIndex) {
      urls = [];
      for (const child of parsed.locs.slice(0, MAX_CHILD_SITEMAPS)) {
        const c = await fetchFollow(child, 5, { maxBytes: 10 * 1024 * 1024 });
        if (c.final.status === 200) urls.push(...parseXml(c.final.body).locs);
        if (urls.length >= MAX_URLS) break;
      }
    }
    return { status: 200, found: true, isXml: true, valid: urls.length > 0, urls: urls.slice(0, MAX_URLS), source };
  }
  return { status: 0, found: false, isXml: false, valid: false, urls: [], source: null };
}
