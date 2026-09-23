export const SITE_NAME = "Призма";

/** Public base URL: env first, then the request's own origin. */
export function siteUrl(req?: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  if (req) return new URL(req.url).origin;
  return "http://localhost:3000";
}
