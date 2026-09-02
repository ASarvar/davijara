import { getTranslations } from "next-intl/server";

import { getTrafficStats } from "@/lib/data/traffic";
import { SiteTrafficLive } from "./site-traffic-live";

/*
  The visitor counter — a full-width navy band above the footer's closing line.

  Server-rendered from the current figures so the numbers are in the HTML for a
  reader with no JavaScript and for a print or search-engine render — then
  <SiteTrafficLive> hydrates and refreshes them every minute, which is what
  makes "Onlayn" current rather than up to five minutes stale.

  The labels are resolved here, on the server, and handed to the client half as
  plain strings — so the band does not need its namespace added to
  NextIntlClientProvider in [locale]/layout.tsx.

  Renders nothing until there is data: getTrafficStats() returns null during
  the build and on a server that has taken no traffic yet, the same way the
  admin-panel menu is absent from a freshly built page until the first
  revalidation (see [locale]/layout.tsx).
*/
export async function SiteTraffic() {
  const [stats, t] = await Promise.all([
    getTrafficStats(),
    getTranslations("footer"),
  ]);
  if (!stats) return null;

  return (
    <SiteTrafficLive
      initial={stats}
      labels={{
        online: t("trafficOnline"),
        actions: t("trafficActions"),
        visits: t("trafficVisits"),
        avgTime: t("trafficAvgTime"),
        secondsShort: t("trafficSecondsShort"),
        minutesShort: t("trafficMinutesShort"),
      }}
    />
  );
}
