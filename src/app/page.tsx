import { AuditForm } from "@/components/AuditForm";
import { Background, Footer, Nav } from "@/components/Chrome";
import { Effects } from "@/components/Effects";
import { DemoDashboard } from "@/components/landing/DemoDashboard";
import { CATEGORIES } from "@/lib/audit/categories";
import { CHECK_COUNT, REGISTRY } from "@/lib/audit/checks";
import type { Metadata } from "next";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    url: "/",
    type: "website",
    locale: "ru_RU",
    siteName: "SEOneiro",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "SEOneiro — SEO и GEO аудит сайта" }],
  },
};

const perCategory = (key: string) => REGISTRY.filter((c) => c.category === key).length;

const CHECK_CARDS = [
  { key: "technical", ic: "⚙", tint: "#e3ecff", text: "HTTPS, коды ответов, редиректы, скорость сервера, сжатие, кэш." },
  { key: "meta", ic: "T", tint: "#efe8ff", text: "Title, description и H1: заполнены, уникальны, нужной длины." },
  { key: "indexing", ic: "⌕", tint: "#dff5ee", text: "robots.txt, sitemap.xml, canonical, noindex и дубли адресов." },
  { key: "ai", ic: "✦", tint: "#f6e6f6", text: "Доступ AI-ботов, прямой ответ на главной, цены текстом, FAQ." },
  { key: "content", ic: "¶", tint: "#fdf0e2", text: "Объём текста, заголовки, картинки и alt, дубли, контакты." },
  { key: "structure", ic: "⌗", tint: "#e6f2ff", text: "Понятные адреса, битые ссылки, «хлебные крошки», карта сайта." },
  { key: "markup", ic: "{ }", tint: "#eaf1ff", text: "Schema.org, организация, Open Graph и карточки для соцсетей." },
  { key: "mobile", ic: "▯", tint: "#e9f7e6", text: "Viewport, ширины блоков, размер текста, картинки под телефон." },
  { key: "trust", ic: "§", tint: "#fbeaea", text: "Политика ПДн, согласия в формах, cookie, заголовки защиты." },
] as const;

const PRICES = [
  { name: "Старт", for: "Один сайт", cost: "9 990", tint: "t-coral", cta: "Начать", items: ["Аудит по всему реестру проверок", "План работ с приоритетами", "Техническая оптимизация", "Кабинет с историей балла"] },
  { name: "Рост", for: "Сайт и продвижение", cost: "14 990", tint: "t-sky", cta: "Выбрать «Рост»", hot: true, items: ["Всё из «Старта»", "Ключевые фразы под нишу и город", "Видимость в Яндексе, Google и ИИ", "Приоритетная поддержка"] },
  { name: "Лидер", for: "С работой специалиста", cost: "19 990", tint: "t-lilac", cta: "Стать лидером", items: ["Всё из «Роста»", "Правки сайта специалистом", "Локальное SEO и карты", "Разбор и план на месяц"] },
  { name: "Максимум", for: "Под ключ", cost: "30 000", tint: "t-amber", cta: "Обсудить", items: ["До трёх сайтов", "Тексты и посадочные страницы", "Работа с упоминаниями бренда в ИИ", "Разбор голосом каждый месяц"] },
];

const FAQ = [
  ["Аудит правда бесплатный и без регистрации?", "Да. Вводите адрес, через 1–2 минуты открывается отчёт по постоянной ссылке. Карта, звонок и email не нужны, ссылкой можно поделиться с разработчиком."],
  ["Как можно продвигаться в ответах ИИ?", "Нейросети собирают ответ из источников: страниц сайта, карт, справочников, отзывов. Мы работаем с этими источниками и с тем, чтобы сайт было легко прочитать машине. «Взломать» модель нельзя, задача в том, чтобы ответ опирался на вас."],
  ["Это не накрутка? Сайт не забанят?", "Нет. Ботов, кликеров и покупных ссылок не используем, поэтому результат не пропадает после отключения."],
  ["Что именно проверяет аудит?", `${CHECK_COUNT} проверок в 9 направлениях: техника, мета-теги, индексация, готовность к ИИ, контент, структура, микроразметка, мобильность, безопасность и 152-ФЗ. Плюс скорость по Google PageSpeed.`],
  ["Что нужно от меня?", "Для аудита — только адрес сайта: мы смотрим на него снаружи, как поисковый робот. Для работы по подписке — доступ к сайту или участие вашего разработчика."],
  ["Когда будет результат?", "Отчёт — через 1–2 минуты. Рост позиций зависит от поисковых алгоритмов: в конкурентных нишах это несколько месяцев."],
  ["Почему дешевле агентства?", "Рутину выполняет платформа, специалист подключается точечно. Разница в способе работы, а не в объёме."],
  ["Можно отказаться и вернуть деньги?", "Порядок отказа и возврата описан в публичной оферте. Прочитайте её до оплаты."],
];

function JsonLd() {
  const url = siteUrl();
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", name: "SEOneiro", url, logo: `${url}/icon.svg` },
      { "@type": "WebSite", name: "SEOneiro", url, inLanguage: "ru" },
      {
        "@type": "Service",
        name: "SEO и GEO аудит сайта",
        serviceType: "SEO-аудит",
        provider: { "@type": "Organization", name: "SEOneiro" },
        areaServed: "RU",
        offers: [
          { "@type": "Offer", name: "Бесплатный аудит", price: "0", priceCurrency: "RUB" },
          ...PRICES.map((p) => ({ "@type": "Offer", name: `Тариф «${p.name}»`, price: p.cost.replace(/\s/g, ""), priceCurrency: "RUB" })),
        ],
      },
      { "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export default function Home() {
  return (
    <>
      <JsonLd />
      <Background />
      <div className="wrap">
        <Nav />
        <main>
          <section className="hero" id="audit">
            <div className="dots" aria-hidden="true" />
            <div className="glow" aria-hidden="true" />
            <div className="hero-in">
              <span className="eyebrow">
                <i />
                SEO + GEO аудит · Яндекс · Google · ИИ
              </span>
              <h1 className="h1">
                <span className="ln">
                  Ваш сайт{" "}
                  <span className="chip ring-chip" role="img" aria-label="балл 78">
                    <span>78</span>
                  </span>
                </span>{" "}
                <span className="ln">первым в&nbsp;поиске</span>{" "}
                <span className="ln">
                  и&nbsp;в&nbsp;ответах{" "}
                  <span className="chip ai-chip">
                    <i>ИИ</i>
                  </span>
                </span>
              </h1>
              <p className="sub">
                Вставьте адрес сайта. Через 2 минуты покажем балл по {CHECK_COUNT} проверкам, графики по направлениям, скорость и план работ по приоритету.
              </p>
              <AuditForm id="url" showQueryError />
              <div className="trust">
                <span>Без регистрации</span>
                <span>Отчёт по постоянной ссылке</span>
                <span>Белые методы</span>
                <span>Данные в РФ</span>
              </div>
            </div>
          </section>

          <div className="engines glass rise">
            <small>Проверяем, как сайт видят</small>
            <span>Яндекс</span>
            <span>Google</span>
            <span>ChatGPT</span>
            <span>Perplexity</span>
            <span>Алиса</span>
            <span>GigaChat</span>
          </div>

          <section className="rise">
            <div className="bento" data-play>
              <div className="tile glass first">
                <p className="tile-title">Отчёт строится по фактическим данным вашего сайта, а не по шаблону</p>
                <p>Отчёт открывается по ссылке, его можно сразу переслать разработчику.</p>
              </div>
              <div className="tile glass">
                <span className="num" data-count={CHECK_COUNT}>
                  {CHECK_COUNT}
                </span>
                <p>проверок в 9 направлениях: от техники до готовности к ИИ</p>
                <div className="tags">
                  <span>Техника</span>
                  <span>Контент</span>
                  <span>152-ФЗ</span>
                </div>
              </div>
              <div className="tile glass">
                <span className="num">
                  2<small> мин</small>
                </span>
                <p>до готового отчёта с баллом, графиками и планом работ</p>
                <div className="tags">
                  <span>PageSpeed</span>
                  <span>Core Web Vitals</span>
                </div>
              </div>
              <div className="tile color glass">
                <span className="pill">✦ Видимость в ИИ</span>
                <span className="num">6</span>
                <p>нейросетей, в которых проверяем, называют ли вашу компанию</p>
                <div className="mini-bars" aria-hidden="true">
                  {[30, 45, 38, 62, 74, 92].map((h) => (
                    <i key={h} style={{ ["--h" as string]: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section id="report">
            <div className="head center rise">
              <span className="eyebrow">
                <i />
                Пример отчёта
              </span>
              <h2 className="h2">
                Вся аналитика по сайту
                <br />
                на <span className="iris-text">одном экране</span>
              </h2>
              <p className="lead">Балл, проблемы по важности, профиль по направлениям, скорость Google PageSpeed, динамика и видимость в ИИ. Понятно без SEO-специалиста.</p>
            </div>
            <DemoDashboard />
          </section>

          <section id="how">
            <div className="head center rise">
              <span className="eyebrow">
                <i />
                Как это работает
              </span>
              <h2 className="h2">Три шага. От вас нужен только первый</h2>
            </div>
            <div className="steps">
              <div className="blobs" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <div className="step glass rise">
                <span className="n">Шаг 1 · 1–2 минуты</span>
                <h3>Проверка сайта</h3>
                <p>Обходим до 20 страниц как поисковый робот и прогоняем {CHECK_COUNT} проверок. Доступ к сайту не нужен.</p>
                <div className="demo">
                  <div className="chk">
                    <span>Читаем robots.txt</span>
                    <span>Готово</span>
                  </div>
                  <div className="chk">
                    <span>Обходим страницы 14/20</span>
                    <span>Идёт</span>
                  </div>
                  <div className="progress">
                    <i />
                  </div>
                  <div className="chk pending">
                    <span>Считаем балл</span>
                    <span>Ждёт</span>
                  </div>
                </div>
              </div>
              <div className="step glass rise">
                <span className="n">Шаг 2 · сразу</span>
                <h3>План работ</h3>
                <p>Каждая проблема превращается в понятную задачу: где найдено, почему важно и что это даст.</p>
                <div className="demo">
                  <div className="chk">
                    <span>Исправить битые ссылки</span>
                    <span className="tag bad">Критично</span>
                  </div>
                  <div className="chk">
                    <span>Заполнить мета-теги · 5 стр.</span>
                    <span className="tag warn">Важно</span>
                  </div>
                  <div className="chk">
                    <span>Сжать картинки · 12 стр.</span>
                    <span className="tag soft">Совет</span>
                  </div>
                </div>
              </div>
              <div className="step glass rise">
                <span className="n">Шаг 3 · по подписке</span>
                <h3>Рост и контроль</h3>
                <p>Ведём позиции в Яндексе и Google, видимость в ИИ и следим, чтобы исправленное не ломалось снова.</p>
                <div className="demo chart">
                  <svg viewBox="0 0 260 70" role="img" aria-label="Растущая линия позиций">
                    <defs>
                      <linearGradient id="gl2" x1="0" x2="1">
                        <stop offset="0" stopColor="#4f7bff" />
                        <stop offset="1" stopColor="#d57ad6" />
                      </linearGradient>
                    </defs>
                    <path d="M4 60 C40 58 60 50 90 46 S150 30 180 24 S230 10 256 8" fill="none" stroke="url(#gl2)" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="256" cy="8" r="4" fill="#d57ad6" />
                  </svg>
                  <div className="chk">
                    <span>Кабинет с историей аудитов</span>
                    <span>✓</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="head rise">
              <span className="eyebrow">
                <i />
                Что проверяем
              </span>
              <h2 className="h2">9 направлений, у каждого свой балл</h2>
            </div>
            <div className="checks">
              {CHECK_CARDS.map((c) => (
                <div key={c.key} className="chkcard glass rise" style={{ ["--tint" as string]: c.tint }}>
                  <span className="ic" aria-hidden="true">
                    {c.ic}
                  </span>
                  <h3>{CATEGORIES.find((x) => x.key === c.key)!.label}</h3>
                  <p>{c.text}</p>
                  <small>{perCategory(c.key)} проверок</small>
                </div>
              ))}
            </div>
          </section>

          <section id="geo">
            <div className="geo">
              <div className="l rise">
                <span className="eyebrow">
                  <i />
                  Новая реальность поиска
                </span>
                <h2 className="h2">
                  Клиент спросил нейросеть. <span className="iris-text">Она назвала вас?</span>
                </h2>
                <p className="lead">Задаём нейросетям вопросы вашего покупателя, не подсказывая название компании, и сохраняем каждый ответ целиком вместе с источниками.</p>
                <div className="rules">
                  <div>
                    <i />
                    <span>
                      <b>Без подсказки бренда.</b> Ни вы, ни конкуренты в вопрос не попадают.
                    </span>
                  </div>
                  <div>
                    <i />
                    <span>
                      <b>Ответ целиком.</b> Видно, похвалили вас, перепутали или не заметили.
                    </span>
                  </div>
                  <div>
                    <i />
                    <span>
                      <b>Сбой — это не ноль.</b> Если модель не ответила, так и пишем, а не рисуем 0%.
                    </span>
                  </div>
                </div>
                <a className="btn dark" href="#pricing" style={{ alignSelf: "flex-start" }}>
                  Подключить замер видимости
                </a>
              </div>
              <div className="chat glass rise" aria-label="Пример ответа нейросети">
                <div className="who">
                  <i />
                  Нейросеть · пример ответа
                </div>
                <div className="q">Посоветуй стоматологию в Тамбове, где делают имплантацию</div>
                <div className="a">
                  Чаще всего рекомендуют:
                  <ol>
                    <li>«Дента-Люкс»: имплантация от 35 000 ₽</li>
                    <li>«Улыбка+»: рядом с центром, приём в день обращения</li>
                  </ol>
                  <span className="miss">Вашей клиники в ответе нет</span>
                </div>
                <div className="src">
                  <span>2gis.ru</span>
                  <span>prodoctorov.ru</span>
                  <span>yandex.ru/maps</span>
                </div>
                <div className="typing" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="head rise">
              <span className="eyebrow">
                <i />
                Честное сравнение
              </span>
              <h2 className="h2">Агентство, автопродвижение и мы</h2>
            </div>
            <div className="cmp table-scroll glass rise">
              <table>
                <thead>
                  <tr>
                    <th>Параметр</th>
                    <th className="us">SEOneiro</th>
                    <th>SEO-агентство</th>
                    <th>Автопродвижение</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Проверка до оплаты", "Полный аудит бесплатно, без регистрации", "КП после звонка менеджера", "Демо после регистрации"],
                    ["Каналы", "Яндекс, Google и ответы ИИ", "Обычно Яндекс и Google", "Чаще только Яндекс"],
                    ["Методы", "Белые: техника и содержание сайта", "Белые", "Нередко накрутка: риск санкций"],
                    ["После отключения", "Исправления остаются вашими", "Остаются", "Позиции падают сразу"],
                    ["Отчётность", "Живой отчёт и кабинет с историей", "Документ раз в месяц", "Счётчик позиций"],
                  ].map(([k, us, a, b]) => (
                    <tr key={k}>
                      <td>{k}</td>
                      <td className="us">{us}</td>
                      <td>{a}</td>
                      <td>{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="pricing">
            <div className="head center rise">
              <span className="eyebrow">
                <i />
                Тарифы
              </span>
              <h2 className="h2">Аудит бесплатно. Работа по подписке</h2>
              <p className="lead">Сначала посмотрите отчёт, потом решайте, нужна ли помощь.</p>
            </div>
            <div className="prices">
              {PRICES.map((p) => (
                <div key={p.name} className={`price glass ${p.tint} ${p.hot ? "hot" : ""} rise`}>
                  {p.hot && <span className="badge">Выбирают чаще</span>}
                  <h3>{p.name}</h3>
                  <span className="for">{p.for}</span>
                  <span className="cost">
                    {p.cost} ₽<small> / мес</small>
                  </span>
                  <ul>
                    {p.items.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                  <a className={`btn ${p.hot ? "dark" : "ghost"}`} href="#audit">
                    {p.cta}
                  </a>
                </div>
              ))}
            </div>
            <p className="ref rise">Приведите друга: 1 500 ₽ вам и скидка 10% ему на первый месяц.</p>
          </section>

          <section id="faq">
            <div className="head center rise">
              <span className="eyebrow">
                <i />
                Вопросы
              </span>
              <h2 className="h2">Что обычно спрашивают перед стартом</h2>
            </div>
            <div className="qa">
              {FAQ.map(([q, a], i) => (
                <details key={q} className="glass rise" open={i === 0}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </section>

          <section>
            <div className="cta rise">
              <div>
                <h2 className="h2">Узнайте, что мешает сайту прямо сейчас</h2>
                <p>Балл, проблемы по важности, скорость и план работ. Две минуты, без звонка и без карты.</p>
              </div>
              <AuditForm id="url2" button="Проверить" />
            </div>
          </section>
        </main>
        <Footer />
      </div>
      <Effects />
    </>
  );
}
