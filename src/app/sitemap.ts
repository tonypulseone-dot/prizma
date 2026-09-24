import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    ...["/offer", "/privacy", "/cookies", "/bot"].map((p) => ({ url: `${base}${p}`, changeFrequency: "yearly" as const, priority: 0.3 })),
  ];
}
