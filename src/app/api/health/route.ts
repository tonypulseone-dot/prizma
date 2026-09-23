export const dynamic = "force-dynamic";

/** Liveness probe for Docker and Caddy. */
export function GET() {
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
