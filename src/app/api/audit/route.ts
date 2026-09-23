import { createAudit } from "@/lib/audit/run";
import { InputError, normalizeInputUrl } from "@/lib/audit/url";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const LIMIT = Number(process.env.AUDIT_RATE_LIMIT) || 10;

function redirect(location: string) {
  return new Response(null, { status: 303, headers: { Location: location } });
}

/** Accepts a plain HTML form (works without JavaScript) or JSON { url }. */
export async function POST(req: Request) {
  const isForm = !(req.headers.get("content-type") || "").includes("application/json");
  let raw = "";
  let returnTo = "/";
  try {
    if (isForm) {
      const form = await req.formData();
      raw = String(form.get("url") || "");
      const back = String(form.get("returnTo") || "/");
      returnTo = back.startsWith("/") && !back.startsWith("//") ? back : "/";
    } else {
      raw = String((await req.json())?.url || "");
    }
  } catch {
    raw = "";
  }

  const fail = (message: string, status: number) =>
    isForm ? redirect(`${returnTo}?error=${encodeURIComponent(message)}#audit`) : Response.json({ error: message }, { status });

  if (!rateLimit(`audit:${clientIp(req)}`, LIMIT, 60 * 60 * 1000)) {
    return fail("Слишком много проверок подряд. Попробуйте через час.", 429);
  }
  try {
    const url = normalizeInputUrl(raw);
    const rec = await createAudit(url);
    return isForm ? redirect(`/report/${rec.id}`) : Response.json({ id: rec.id, reportUrl: `/report/${rec.id}` }, { status: 201 });
  } catch (e) {
    if (e instanceof InputError) return fail(e.message, 400);
    console.error("audit create failed", e);
    return fail("Не удалось запустить проверку. Попробуйте ещё раз.", 500);
  }
}
