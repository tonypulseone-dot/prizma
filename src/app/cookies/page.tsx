import type { Metadata } from "next";
import { DocPage } from "@/components/DocPage";

export const metadata: Metadata = {
  title: "Использование cookie на сайте SEOneiro",
  description: "SEOneiro не ставит рекламные, аналитические и технические cookie, поэтому на сайте нет баннера с согласием.",
  alternates: { canonical: "/cookies" },
};

export default function Cookies() {
  return (
    <DocPage title="Использование cookie" updated="24 сентября 2026 г.">
      <p>
        Сейчас SEOneiro не устанавливает cookie: ни рекламные, ни аналитические, ни собственные технические. Поэтому баннера с согласием на сайте нет.
      </p>
      <p>
        Браузер может сохранить у себя файлы сайта (шрифты, стили) для быстрой загрузки. Это обычный кэш, он не содержит данных о вас.
      </p>
      <p>
        Если позже появятся личный кабинет или аналитика, мы обновим эту страницу и спросим согласие до того, как что-либо сохранять.
      </p>
    </DocPage>
  );
}
