import { getTranslations } from "next-intl/server";

import { NewsRow } from "@/components/common/news-row";
import { SurfaceCard } from "@/components/common/surface-card";
import type { NewsItem } from "@/types/content";

/*
  "Boshqa yangiliklar" as a sidebar column beside the article, not as a row of
  cards under it.

  A reader who has finished the text is already at the bottom of the page; a
  grid down there is only found by scrolling past the end of what they came
  for. In the sidebar the same four items are visible from the first screen and
  stay in view while the article scrolls (`lg:sticky`), which is what makes
  them a way through the section rather than a footer.
*/
export async function NewsAside({ items }: { items: NewsItem[] }) {
  if (items.length === 0) return null;
  const t = await getTranslations("news");

  return (
    <aside className="lg:sticky lg:top-28">
      <h2 className="mb-4 text-base font-semibold">{t("related")}</h2>

      <SurfaceCard as="section" radius="lg" padding="none">
        <ul className="divide-border divide-y">
          {items.map((item) => (
            <li key={item.slug}>
              <NewsRow item={item} />
            </li>
          ))}
        </ul>
      </SurfaceCard>
    </aside>
  );
}
