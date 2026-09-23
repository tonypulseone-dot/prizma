import { toStatus } from "@/lib/audit/run";
import { getAudit } from "@/lib/store";

export async function GET(_req: Request, ctx: RouteContext<"/api/audit/[id]/status">) {
  const { id } = await ctx.params;
  const rec = await getAudit(id);
  if (!rec) return Response.json({ error: "Отчёт не найден" }, { status: 404 });
  return Response.json(toStatus(rec), { headers: { "Cache-Control": "no-store" } });
}
