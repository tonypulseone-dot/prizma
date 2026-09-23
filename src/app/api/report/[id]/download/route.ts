import { downloadFileName, renderReportHtml } from "@/lib/audit/download";
import { buildReportView } from "@/lib/audit/report";
import { siteUrl } from "@/lib/site";
import { getAudit } from "@/lib/store";

export async function GET(req: Request, ctx: RouteContext<"/api/report/[id]/download">) {
  const { id } = await ctx.params;
  const rec = await getAudit(id);
  if (!rec || rec.status !== "done") return new Response("Отчёт ещё не готов", { status: 404 });
  const view = buildReportView(rec);
  return new Response(renderReportHtml(view, siteUrl(req)), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${downloadFileName(view)}"`,
      "Cache-Control": "no-store",
    },
  });
}
