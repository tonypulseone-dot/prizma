import type { Metadata, Viewport } from "next";
import "@fontsource/onest/400.css";
import "@fontsource/onest/500.css";
import "@fontsource/onest/600.css";
import "@fontsource/onest/700.css";
import "@fontsource/golos-text/400.css";
import "@fontsource/golos-text/500.css";
import "@fontsource/golos-text/600.css";
import "./globals.css";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Бесплатный SEO-аудит сайта и видимость в ИИ — Призма", template: "%s — Призма" },
  description: "Проверьте сайт по 127 параметрам за 2 минуты: техника, индексация, контент, скорость, 152-ФЗ и готовность к ответам нейросетей. Балл, графики и план работ.",
  applicationName: "Призма",
  openGraph: { type: "website", locale: "ru_RU", siteName: "Призма", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Призма — SEO и GEO аудит сайта" }] },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
  robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#8d6bff", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
