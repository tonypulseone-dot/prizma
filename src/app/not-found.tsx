import { AuditForm } from "@/components/AuditForm";
import { Background, Footer, Nav } from "@/components/Chrome";

export default function NotFound() {
  return (
    <>
      <Background />
      <div className="wrap">
        <Nav home={false} />
        <div className="progress-card glass">
          <span className="eyebrow">
            <i />
            Ошибка 404
          </span>
          <h1 className="h2">Такой страницы нет</h1>
          <p className="lead">Возможно, ссылка устарела. Можно проверить сайт заново или вернуться на главную.</p>
          <AuditForm id="nf-url" />
          <a className="btn ghost" href="/" style={{ alignSelf: "flex-start" }}>
            На главную
          </a>
        </div>
        <Footer />
      </div>
    </>
  );
}
