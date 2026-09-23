import type { MetadataRoute } from "next";
import { AI_BOTS } from "@/lib/audit/robots";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const disallow = ["/api/", "/report/"];
  return {
    rules: [{ userAgent: "*", allow: "/", disallow }, ...AI_BOTS.map((userAgent) => ({ userAgent, allow: "/", disallow }))],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
