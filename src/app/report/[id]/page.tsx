import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuditForm } from "@/components/AuditForm";
import { Background, Footer, Nav } from "@/components/Chrome";
import { Effects } from "@/components/Effects";
import { ReportBody } from "@/components/report/ReportBody";
import { ProgressLive } from "@/components/report/Live";
import { buildReportView } from "@/lib/audit/report";
import { toStatus } from "@/lib/audit/run";
import { siteUrl } from "@/lib/site";
import { getAudit } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/report/[id]">): Promise<Metadata> {
  const { id } = await params;
  const rec = await getAudit(id);
  return {
    title: rec ? `Аудит ${rec.host}` : "Отчёт не найден",
    robots: { index: false, follow: false },
  };
}

export default async function ReportPage({ params }: PageProps<"/report/[id]">) {
  const { id } = await params;
  const rec = await getAudit(id);
  if (!rec) notFound();
  const reportUrl = `${siteUrl()}/report/${rec.id}`;

  return (
    <>
      <Background />
      <div className="wrap">
        <Nav home={false} />
        {rec.status === "done" ? (
          <ReportBody view={buildReportView(rec)} reportUrl={reportUrl} />
        ) : rec.status === "failed" ? (
          <div className="progress-card glass">
            <span className="eyebrow">
              <i />
              Проверка не удалась
            </span>
            <h1 className="h2" style={{ fontSize: "clamp(26px,4vw,40px)" }}>
              {rec.host}
            </h1>
            <p className="notice">{rec.errorMessage}</p>
            <p className="lead">Проверьте адрес и попробуйте ещё раз.</p>
            <AuditForm id="retry-url" button="Проверить снова" />
          </div>
        ) : (
          <ProgressLive id={rec.id} initial={toStatus(rec)} reportUrl={reportUrl} />
        )}
        <Footer />
      </div>
      <Effects />
    </>
  );
}
