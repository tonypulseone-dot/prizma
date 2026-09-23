import { fetchFollow, fetchOnce, limiter, probeAsset } from "./http";
import { parsePage } from "./parse";
import { isAllowed, parseRobots } from "./robots";
import { loadSitemap } from "./sitemap";
import type { AssetInfo, PageData, SiteContext } from "./types";
import { sameSite, stripWww } from "./url";

export class AuditError extends Error {}

export type ProgressFn = (p: { step: string; percent: number; pagesCrawled: number; pagesPlanned: number }) => void | Promise<void>;

const FILE_EXT = /\.(pdf|jpe?g|png|gif|webp|avif|svg|ico|zip|rar|7z|docx?|xlsx?|pptx?|mp4|mp3|avi|mov|webm|css|js|json|xml|txt|woff2?|ttf|eot|exe|dmg|apk)$/i;
const isHtml = (ct: string, body: string) => /html/i.test(ct) || (!ct && /<html|<!doctype html/i.test(body.slice(0, 1000)));

function canonicalKey(url: string): string {
  const u = new URL(url);
  u.hash = "";
  return u.toString();
}

export async function buildContext(inputUrl: string, onProgress: ProgressFn, maxPages = 20): Promise<SiteContext> {
  const startedAt = Date.now();
  await onProgress({ step: "Открываем сайт", percent: 3, pagesCrawled: 0, pagesPlanned: maxPages });

  let homeChain = await fetchFollow(inputUrl);
  // Sites without HTTPS still get audited over HTTP (and fail the HTTPS check) instead of erroring out.
  if (homeChain.final.status === 0 && inputUrl.startsWith("https://")) {
    const plain = await fetchFollow("http://" + inputUrl.slice("https://".length));
    if (plain.final.status !== 0) homeChain = plain;
  }
  const homeRes = homeChain.final;
  if (homeRes.status === 0) throw new AuditError(`Сайт не открылся: ${(homeRes.error || "нет ответа").replace(/\.+$/, "")}.`);
  if (homeChain.loop) throw new AuditError("Главная страница уходит в бесконечную переадресацию.");
  if (!isHtml(homeRes.contentType, homeRes.body)) throw new AuditError("По этому адресу отдаётся не HTML-страница.");

  const finalUrl = new URL(homeRes.url);
  const origin = finalUrl.origin;
  const host = finalUrl.hostname;

  await onProgress({ step: "Читаем robots.txt", percent: 8, pagesCrawled: 0, pagesPlanned: maxPages });
  const robotsChain = await fetchFollow(new URL("/robots.txt", origin).toString(), 5);
  const robots = parseRobots(robotsChain.final.body, robotsChain.final.status, robotsChain.final.contentType);

  const altHost = host.startsWith("www.") ? stripWww(host) : `www.${host}`;
  const [httpProbe, altHostProbe, notFound, faviconProbe, sitemap] = await Promise.all([
    finalUrl.protocol === "https:" ? fetchFollow(`http://${finalUrl.host}/`, 6) : Promise.resolve(null),
    fetchFollow(`${finalUrl.protocol}//${altHost}${finalUrl.port ? ":" + finalUrl.port : ""}/`, 6).then((c) => (c.final.status === 0 ? null : c)),
    fetchOnce(new URL(`/prizma-check-${Math.random().toString(36).slice(2, 10)}-404`, origin).toString()),
    fetchOnce(new URL("/favicon.ico", origin).toString(), { method: "HEAD" }),
    loadSitemap(origin, robots.sitemaps),
  ]);

  // ---- crawl ----
  const pages: PageData[] = [];
  const linkStatus = new Map<string, number>();
  const linkSources = new Map<string, Set<string>>();
  const seen = new Set<string>();
  const linkQueue: string[] = [];
  const sitemapQueue = sitemap.urls.filter((u) => {
    try {
      return new URL(u).hostname === host;
    } catch {
      return false;
    }
  });

  const enqueue = (url: string, fromSitemap = false) => {
    const key = canonicalKey(url);
    if (seen.has(key)) return;
    const u = new URL(key);
    if (u.hostname !== host || FILE_EXT.test(u.pathname)) return;
    if (!isAllowed(robots, "PrizmaAuditBot", u.pathname + u.search)) return;
    seen.add(key);
    (fromSitemap ? sitemapQueue : linkQueue).push(key);
  };

  const home = parsePage(homeRes, host);
  pages.push(home);
  seen.add(canonicalKey(homeRes.url));
  seen.add(canonicalKey(inputUrl));
  linkStatus.set(canonicalKey(homeRes.url), homeRes.status);

  const registerLinks = (page: PageData) => {
    for (const l of page.links) {
      if (!l.internal || !l.abs) continue;
      const key = canonicalKey(l.abs);
      if (!linkSources.has(key)) linkSources.set(key, new Set());
      linkSources.get(key)!.add(page.url);
      enqueue(key);
    }
  };
  registerLinks(home);
  for (const u of sitemapQueue.splice(0)) enqueue(u, true);

  const run = limiter(4);
  const inFlight = new Set<Promise<void>>();
  const next = () => linkQueue.shift() ?? sitemapQueue.shift();

  await onProgress({ step: "Обходим страницы", percent: 15, pagesCrawled: 1, pagesPlanned: maxPages });
  while (pages.length + inFlight.size < maxPages) {
    const url = next();
    if (!url) {
      if (!inFlight.size) break;
      await Promise.race(inFlight);
      continue;
    }
    const task = run(async () => {
      if (pages.length >= maxPages) return;
      const chain = await fetchFollow(url, 5);
      linkStatus.set(url, chain.hops[0].status);
      const res = chain.final;
      if (chain.hops.length > 1) linkStatus.set(canonicalKey(res.url), res.status);
      // Error pages only feed link statuses; the report lists pages that actually open.
      if (res.status !== 200 || !isHtml(res.contentType, res.body)) return;
      const finalKey = canonicalKey(res.url);
      if (finalKey !== url && pages.some((p) => canonicalKey(p.url) === finalKey)) return;
      if (new URL(res.url).hostname !== host) return;
      if (pages.length >= maxPages) return;
      const page = parsePage(res, host);
      pages.push(page);
      registerLinks(page);
      await onProgress({
        step: "Обходим страницы",
        percent: Math.min(70, 15 + Math.round((pages.length / maxPages) * 55)),
        pagesCrawled: pages.length,
        pagesPlanned: maxPages,
      });
    });
    const tracked: Promise<void> = task.finally(() => inFlight.delete(tracked));
    inFlight.add(tracked);
  }
  await Promise.all(inFlight);
  const pagesPlanned = pages.length;

  // ---- statuses of internal link targets we did not crawl ----
  await onProgress({ step: "Проверяем ссылки", percent: 74, pagesCrawled: pages.length, pagesPlanned });
  const unchecked = [...linkSources.keys()].filter((u) => !linkStatus.has(u) && !FILE_EXT.test(new URL(u).pathname)).slice(0, 80);
  await Promise.all(
    unchecked.map((u) =>
      run(async () => {
        const r = await fetchOnce(u, { method: "HEAD", timeoutMs: 10000 });
        const status = r.status === 405 || r.status === 501 ? (await fetchOnce(u, { timeoutMs: 10000, maxBytes: 65536, countOnly: true })).status : r.status;
        linkStatus.set(u, status);
      }),
    ),
  );

  // ---- images ----
  await onProgress({ step: "Проверяем картинки", percent: 78, pagesCrawled: pages.length, pagesPlanned });
  const imageUrls = [...new Set(pages.flatMap((p) => p.images.map((i) => i.abs).filter((x): x is string => !!x)))].slice(0, 80);
  const images = new Map<string, AssetInfo>();
  await Promise.all(imageUrls.map((u) => run(async () => void images.set(u, await probeAsset(u)))));

  // ---- CSS and static files of the home page ----
  const cssUrls = home.$('link[rel~="stylesheet" i]')
    .map((_, el) => home.$(el).attr("href") || "")
    .get()
    .map((h) => {
      try {
        return new URL(h, home.url).toString();
      } catch {
        return "";
      }
    })
    .filter((u) => u && sameSite(new URL(u).hostname, host))
    .slice(0, 4);
  const cssResponses = await Promise.all(cssUrls.map((u) => run(() => fetchOnce(u, { maxBytes: 1024 * 1024, timeoutMs: 10000 }))));
  const cssText = cssResponses.filter((r) => r.status === 200).map((r) => r.body).join("\n");
  const staticAssets: AssetInfo[] = cssResponses.map((r) => ({ url: r.url, status: r.status, bytes: r.bytes, contentType: r.contentType, headers: r.headers }));
  const sameSiteScripts = home.scripts.filter((s) => sameSite(new URL(s).hostname, host)).slice(0, 2);
  for (const s of sameSiteScripts) staticAssets.push(await probeAsset(s));
  for (const img of [...images.values()].slice(0, 3)) staticAssets.push(img);

  return {
    inputUrl,
    origin,
    host,
    startedAt,
    homeChain,
    httpProbe,
    altHostProbe,
    notFound,
    faviconProbe,
    robots,
    sitemap,
    pages,
    home,
    linkStatus,
    linkSources,
    images,
    cssText,
    staticAssets,
  };
}
