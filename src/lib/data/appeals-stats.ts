import { appealSources, type AppealSourceStat } from "@/content/appeals-stats";
import { localizeContent } from "@/lib/i18n/content";

export type { AppealSourceStat };

export async function getAppealSources(
  locale?: string,
): Promise<AppealSourceStat[]> {
  return localizeContent(appealSources, locale);
}
