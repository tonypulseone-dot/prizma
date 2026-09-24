import { Background, Footer, Nav } from "@/components/Chrome";

/** Shared shell for text pages: legal documents and the crawler description. */
export function DocPage({ title, updated, draft = false, children }: { title: string; updated?: string; draft?: boolean; children: React.ReactNode }) {
  return (
    <>
      <Background />
      <div className="wrap">
        <Nav home={false} />
        <main>
          <article className="doc glass">
            <h1>{title}</h1>
            {updated && <p className="muted">Редакция от {updated}</p>}
            {draft && (
              <p className="draft-note">
                Черновик. Перед запуском впишите реквизиты оператора (ФИО или название, ИНН, ОГРН, адрес, почту) и согласуйте текст с юристом.
              </p>
            )}
            {children}
          </article>
        </main>
        <Footer />
      </div>
    </>
  );
}
