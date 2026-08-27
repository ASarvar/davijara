import { appealSources, type AppealSourceStat } from "@/content/appeals-stats";

export type { AppealSourceStat };

export async function getAppealSources(): Promise<AppealSourceStat[]> {
  return appealSources;
}
