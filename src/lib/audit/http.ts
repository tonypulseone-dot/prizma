import { lookup as dnsLookup, type LookupAddress, type LookupOptions } from "node:dns";
import { Agent, fetch, type Headers, type Response } from "undici";
import type { AssetInfo, HttpResponse, RedirectChain } from "./types";
import { allowPrivate, assertPublicHost, isPrivateIp } from "./url";

export const USER_AGENT =
  "Mozilla/5.0 (compatible; PrizmaAuditBot/1.0; +https://prizma.example/bot)";

const DEFAULT_TIMEOUT = 15000;

type LookupCb = (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

/**
 * Checks the IP at connect time, so a domain that re-resolves to an internal address after
 * assertPublicHost (DNS rebinding) still cannot reach the database or neighbouring containers.
 */
function publicOnlyLookup(hostname: string, options: LookupOptions, cb: LookupCb) {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return cb(err, []);
    const list = addresses as LookupAddress[];
    if (!allowPrivate() && list.some((a) => isPrivateIp(a.address))) {
      return cb(Object.assign(new Error(`${hostname} resolves to a private address`), { code: "EPRIVATE" }), []);
    }
    if (options.all) return cb(null, list);
    cb(null, list[0].address, list[0].family);
  });
}

const dispatcher = new Agent({ connect: { lookup: publicOnlyLookup as never }, keepAliveTimeout: 4000, connections: 16 });
const MAX_HTML_BYTES = 3 * 1024 * 1024;

interface FetchOpts {
  method?: "GET" | "HEAD";
  maxBytes?: number;
  timeoutMs?: number;
  /** Read the body only to count bytes, do not decode it. */
  countOnly?: boolean;
}

function headersToObject(h: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  h.forEach((v, k) => (out[k.toLowerCase()] = v));
  return out;
}

function charsetOf(contentType: string): string | null {
  const m = /charset\s*=\s*["']?([\w-]+)/i.exec(contentType);
  return m ? m[1].toLowerCase() : null;
}

function decode(buf: Uint8Array, contentType: string): string {
  let cs = charsetOf(contentType) || "utf-8";
  let text: string;
  try {
    text = new TextDecoder(cs).decode(buf);
  } catch {
    cs = "utf-8";
    text = new TextDecoder("utf-8").decode(buf);
  }
  if (!charsetOf(contentType)) {
    const meta = /<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(text.slice(0, 4096));
    if (meta && meta[1].toLowerCase() !== cs) {
      try {
        text = new TextDecoder(meta[1].toLowerCase()).decode(buf);
      } catch {
        /* keep utf-8 */
      }
    }
  }
  return text;
}

async function readBody(res: Response, maxBytes: number): Promise<{ buf: Uint8Array; bytes: number }> {
  if (!res.body) return { buf: new Uint8Array(0), bytes: 0 };
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let kept = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (kept < maxBytes) {
      chunks.push(value);
      kept += value.byteLength;
    }
    if (bytes > maxBytes * 4) {
      await reader.cancel().catch(() => {});
      break;
    }
  }
  const buf = new Uint8Array(kept);
  let off = 0;
  for (const c of chunks) {
    buf.set(c.subarray(0, Math.min(c.byteLength, kept - off)), off);
    off += c.byteLength;
    if (off >= kept) break;
  }
  return { buf, bytes };
}

/** One request, no redirect following. Never throws: network errors come back as status 0. */
export async function fetchOnce(url: string, opts: FetchOpts = {}): Promise<HttpResponse> {
  const started = performance.now();
  try {
    await assertPublicHost(new URL(url).hostname);
    const res = await fetch(url, {
      dispatcher,
      method: opts.method ?? "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT),
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-encoding": "gzip, deflate, br",
        "accept-language": "ru,en;q=0.8",
      },
    });
    const ttfbMs = Math.round(performance.now() - started);
    const headers = headersToObject(res.headers);
    const contentType = headers["content-type"] || "";
    let body = "";
    let bytes = Number(headers["content-length"] || 0);
    if (opts.method !== "HEAD") {
      const read = await readBody(res, opts.maxBytes ?? MAX_HTML_BYTES);
      bytes = read.bytes;
      if (!opts.countOnly) body = decode(read.buf, contentType);
    }
    return { url, status: res.status, headers, body, bytes, ttfbMs, contentType };
  } catch (e) {
    const err = e as Error & { cause?: { code?: string; message?: string } };
    const code = err.cause?.code || "";
    const msg =
      err.name === "TimeoutError"
        ? "сайт не ответил за отведённое время"
        : code === "EPRIVATE"
          ? "адрес ведёт во внутреннюю сеть"
          : code === "ENOTFOUND" || code === "EAI_AGAIN"
          ? "домен не найден"
          : code === "ECONNREFUSED"
            ? "сервер отклонил соединение"
            : /CERT|SSL|TLS/i.test(code + (err.cause?.message || ""))
              ? "ошибка SSL-сертификата"
              : err.cause?.message || err.message || "сетевая ошибка";
    return { url, status: 0, headers: {}, body: "", bytes: 0, ttfbMs: Math.round(performance.now() - started), contentType: "", error: msg };
  }
}

/** Follows redirects by hand so the whole chain is visible to the checks. */
export async function fetchFollow(url: string, maxHops = 8, opts: FetchOpts = {}): Promise<RedirectChain> {
  const hops: HttpResponse[] = [];
  const seen = new Set<string>();
  let current = url;
  for (let i = 0; i <= maxHops; i++) {
    if (seen.has(current)) {
      return { hops, final: hops[hops.length - 1], loop: true, error: "Зацикленная переадресация" };
    }
    seen.add(current);
    const res = await fetchOnce(current, opts);
    hops.push(res);
    const loc = res.headers["location"];
    if (res.status >= 300 && res.status < 400 && loc) {
      try {
        current = new URL(loc, current).toString();
      } catch {
        return { hops, final: res, loop: false, error: "Некорректный заголовок Location" };
      }
      continue;
    }
    return { hops, final: res, loop: false, error: res.error };
  }
  return { hops, final: hops[hops.length - 1], loop: true, error: "Слишком много переадресаций" };
}

/** Status, size and type of a static file. Falls back to GET when HEAD is not supported. */
export async function probeAsset(url: string): Promise<AssetInfo> {
  let res = await fetchOnce(url, { method: "HEAD", timeoutMs: 10000 });
  if (res.status === 405 || res.status === 501 || res.status === 0 || (res.status < 400 && !res.headers["content-length"])) {
    res = await fetchOnce(url, { timeoutMs: 15000, maxBytes: 6 * 1024 * 1024, countOnly: true });
  }
  const len = res.headers["content-length"];
  return {
    url,
    status: res.status,
    bytes: res.bytes || (len ? Number(len) : null),
    contentType: res.contentType,
    headers: res.headers,
  };
}

export function limiter(concurrency: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  const next = () => {
    if (active >= concurrency || !queue.length) return;
    active++;
    queue.shift()!();
  };
  return function run<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(() =>
        fn()
          .then(resolve, reject)
          .finally(() => {
            active--;
            next();
          }),
      );
      next();
    });
  };
}
