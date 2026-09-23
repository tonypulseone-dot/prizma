import http from "node:http";
import type { AddressInfo } from "node:net";

/** A tiny site with known problems, served locally so the engine can be tested end to end. */
const layout = (title: string, body: string, head = "") => `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>${head}</head>
<body><header><nav><a href="/">Главная</a><a href="/about/">О нас</a><a href="/services/">Услуги</a><a href="/old/">Старая</a><a href="/missing-page/">Пропавшая</a></nav></header>
${body}
<footer><a href="/privacy/">Политика конфиденциальности</a> <a href="tel:+74950000000">+7 495 000-00-00</a></footer></body></html>`;

const words = (n: number) => Array.from({ length: n }, (_, i) => ["ремонт", "квартир", "под", "ключ", "в", "Москве", "цена", "сроки"][i % 8]).join(" ");

const heavy = Buffer.alloc(420 * 1024, 1);

export const ROUTES: Record<string, { status?: number; type?: string; body: string | Buffer; headers?: Record<string, string> }> = {
  "/": {
    body: layout(
      "Ремонт квартир под ключ в Москве недорого и качественно от компании Ремонт-Сервис",
      `<main><h1>Ремонт квартир</h1><h3>Пропуск уровня</h3><p>${words(260)}</p>
      <p>Стоимость от 4 500 ₽ за м², срок 30 дней.</p>
      <img src="/img/heavy.jpg" alt="IMG_1234.jpg"><img src="/img/ok.webp" alt="Кухня после ремонта" width="400" height="300">
      <a href="https://example.org/partner">Партнёр</a>
      <form action="/send" method="post"><input name="name" placeholder="Имя"><input type="tel" name="phone" placeholder="Телефон"><button type="submit">Отправить</button></form>
      <details><summary>Сколько стоит?</summary>От 4 500 ₽.</details><details><summary>Какие сроки?</summary>30 дней.</details>
      <ul><li>Дизайн</li><li>Черновые работы</li><li>Чистовая отделка</li></ul></main>`,
      `<meta name="description" content="Ремонт квартир под ключ в Москве: смета за день, фиксированная цена, гарантия 3 года и чистота на объекте.">
      <link rel="canonical" href="http://HOST/"><meta property="og:title" content="Ремонт квартир"><meta property="og:description" content="Под ключ">
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":"Ремонт-Сервис"}</script>
      <style>.wrap{width:1200px}</style>`,
    ),
  },
  "/about/": {
    body: layout(
      "О компании Ремонт-Сервис — ремонт квартир в Москве",
      `<main><h1>О компании</h1><h2>История</h2><p>${words(230)}</p></main>`,
      `<link rel="canonical" href="http://HOST/about/">`,
    ),
  },
  "/services/": {
    body: layout(
      "О компании Ремонт-Сервис — ремонт квартир в Москве",
      `<main><h1>Услуги</h1><h2>Список</h2><p>${words(40)}</p><a href="/services/remont/kvartiry/">Квартиры</a></main>`,
    ),
  },
  "/services/remont/kvartiry/": {
    body: layout("Ремонт квартир: цены и сроки работ в Москве в 2026 году", `<main><h1>Квартиры</h1><h2>Цены</h2><p>${words(220)}</p></main>`),
  },
  "/privacy/": { body: layout("Политика обработки персональных данных Ремонт-Сервис", `<main><h1>Политика</h1><p>${words(220)}</p></main>`) },
  "/old/": { status: 301, body: "", headers: { location: "/about/" } },
  "/robots.txt": { type: "text/plain", body: "User-agent: *\nDisallow: /admin/\n\nUser-agent: GPTBot\nDisallow: /\n\nSitemap: http://HOST/sitemap.xml\n" },
  "/sitemap.xml": {
    type: "application/xml",
    body: `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>http://HOST/</loc></url><url><loc>http://HOST/about/</loc></url></urlset>`,
  },
  "/img/heavy.jpg": { type: "image/jpeg", body: heavy },
  "/img/ok.webp": { type: "image/webp", body: Buffer.alloc(20 * 1024, 2), headers: { "cache-control": "max-age=86400" } },
};

export async function startFixtureSite(listenPort = 0): Promise<{ origin: string; close: () => Promise<void> }> {
  const server = http.createServer((req, res) => {
    const host = `127.0.0.1:${(server.address() as AddressInfo).port}`;
    const path = (req.url || "/").split("?")[0];
    const route = ROUTES[path];
    if (!route) {
      res.writeHead(404, { "content-type": "text/html; charset=utf-8", server: "nginx/1.25.3" });
      res.end("<html><body>Not found</body></html>");
      return;
    }
    const body = typeof route.body === "string" ? route.body.replaceAll("HOST", host) : route.body;
    res.writeHead(route.status || 200, {
      "content-type": route.type || "text/html; charset=utf-8",
      server: "nginx/1.25.3",
      ...(route.headers || {}),
    });
    res.end(req.method === "HEAD" ? undefined : body);
  });
  await new Promise<void>((r) => server.listen(listenPort, "127.0.0.1", r));
  const { port } = server.address() as AddressInfo;
  return { origin: `http://127.0.0.1:${port}/`, close: () => new Promise((r) => server.close(() => r())) };
}
