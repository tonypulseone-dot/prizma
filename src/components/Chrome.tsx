import Link from "next/link";

export function Background() {
  return (
    <>
      <div className="mesh" aria-hidden="true">
        <b />
        <b />
        <b />
        <b />
        <b />
      </div>
      <div className="grain" aria-hidden="true" />
    </>
  );
}

export function Nav({ home = true }: { home?: boolean }) {
  const h = (hash: string) => (home ? hash : `/${hash}`);
  return (
    <header className="nav glass">
      <Link className="logo" href="/" aria-label="SEOneiro, на главную">
        <i aria-hidden="true" />
        <span>
          SEO<b className="iris-text">neiro</b>
        </span>
      </Link>
      <nav className="links" aria-label="Разделы">
        <a href={h("#report")}>Отчёт</a>
        <a href={h("#how")}>Как работает</a>
        <a href={h("#geo")}>Видимость в ИИ</a>
        <a href={h("#pricing")}>Тарифы</a>
        <a href={h("#faq")}>Вопросы</a>
      </nav>
      <span className="sp" />
      <a className="btn dark" href={h("#audit")}>
        Проверить сайт
      </a>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site">
      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 320 }}>
        <span className="logo">
          <i aria-hidden="true" />
          <span>
            SEO<b className="iris-text">neiro</b>
          </span>
        </span>
        <span>Проверяем сайт и показываем, что чинить, чтобы вас находили в Яндексе, Google и ответах нейросетей.</span>
      </div>
      <div className="cols">
        <div>
          <b>Сервис</b>
          <a href="/#audit">Аудит сайта</a>
          <a href="/#geo">Видимость в ИИ</a>
          <a href="/#pricing">Тарифы</a>
        </div>
        <div>
          <b>Ресурсы</b>
          <a href="/#how">Как работает</a>
          <a href="/#faq">Вопросы</a>
        </div>
        <div>
          <b>Документы</b>
          <a href="/offer">Оферта</a>
          <a href="/privacy">Политика обработки ПДн</a>
          <a href="/cookies">Cookie</a>
          <a href="/bot">Наш робот SeoneiroBot</a>
        </div>
      </div>
      <div className="wordmark" aria-hidden="true">
        SEOneiro
      </div>
      <div className="legal">© {new Date().getFullYear()} SEOneiro · seoneiro.ru</div>
    </footer>
  );
}
