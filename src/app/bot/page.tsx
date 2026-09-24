import type { Metadata } from "next";
import { DocPage } from "@/components/DocPage";

export const metadata: Metadata = {
  title: "Робот SeoneiroBot: что проверяет и как запретить",
  description: "Что за робот SeoneiroBot заходит на ваш сайт, сколько страниц смотрит и как его ограничить.",
  alternates: { canonical: "/bot" },
};

export default function Bot() {
  return (
    <DocPage title="Робот SeoneiroBot">
      <p>
        Если в логах вашего сайта есть <code>SeoneiroBot/1.0</code>, значит, кто-то запустил бесплатный SEO-аудит вашего сайта на seoneiro.ru.
      </p>
      <h2>Что он делает</h2>
      <ul>
        <li>Открывает главную, robots.txt, sitemap.xml и до 20 страниц сайта, как обычный поисковый робот.</li>
        <li>Проверяет ссылки и картинки короткими запросами HEAD.</li>
        <li>Делает не больше 4 запросов одновременно и ничего не отправляет в формы.</li>
        <li>Соблюдает правила robots.txt для всех роботов (<code>User-agent: *</code>) и для себя.</li>
      </ul>
      <h2>Как запретить</h2>
      <pre>{`User-agent: SeoneiroBot
Disallow: /`}</pre>
      <p className="muted">Пишите, если робот мешает сайту: ответим и разберёмся.</p>
    </DocPage>
  );
}
