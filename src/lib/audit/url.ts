import { lookup } from "node:dns/promises";
import net from "node:net";

export class InputError extends Error {}

export const allowPrivate = () => process.env.AUDIT_ALLOW_PRIVATE_HOSTS === "1";

/** Turns whatever the visitor typed into the site's root URL. Cyrillic domains become punycode. */
export function normalizeInputUrl(raw: string): string {
  let value = (raw || "").trim();
  if (!value) throw new InputError("Введите адрес сайта.");
  if (value.length > 2048) throw new InputError("Адрес слишком длинный.");
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) value = "https://" + value;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new InputError("Не получилось разобрать адрес. Пример: ваш-сайт.ru");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new InputError("Поддерживаются только адреса http и https.");
  }
  if (url.username || url.password) throw new InputError("Уберите логин и пароль из адреса.");
  const host = url.hostname.toLowerCase();
  const isIp = net.isIP(host.replace(/^\[|\]$/g, "")) !== 0;
  if (!allowPrivate() && (isIp || !host.includes(".") || host.endsWith(".local") || host === "localhost")) {
    throw new InputError("Укажите публичный адрес сайта, например ваш-сайт.ru");
  }
  return `${url.protocol}//${url.host}/`;
}

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7));
  return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80");
}

const hostCache = new Map<string, Promise<void>>();

/** Blocks requests to loopback, LAN and cloud metadata addresses (SSRF protection). */
export function assertPublicHost(hostname: string): Promise<void> {
  if (allowPrivate()) return Promise.resolve();
  const host = hostname.replace(/^\[|\]$/g, "");
  let pending = hostCache.get(host);
  if (!pending) {
    pending = (async () => {
      const addrs = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
      if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) {
        throw new InputError("адрес ведёт во внутреннюю сеть, такие сайты не проверяем");
      }
    })();
    hostCache.set(host, pending);
    pending.catch(() => hostCache.delete(host));
  }
  return pending;
}

export function toAbsolute(href: string, base: string): string | null {
  try {
    const u = new URL(href, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

export const stripWww = (host: string) => host.replace(/^www\./, "");

export function sameSite(a: string, b: string): boolean {
  return stripWww(a.toLowerCase()) === stripWww(b.toLowerCase());
}

export function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.host + u.pathname + u.search;
  } catch {
    return url;
  }
}
