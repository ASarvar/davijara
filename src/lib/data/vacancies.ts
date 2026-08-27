import { vacancyInfo, type VacancyInfo } from "@/content/vacancies";

export type { VacancyInfo, VacancyTableRow } from "@/content/vacancies";

export async function getVacancyInfo(): Promise<VacancyInfo> {
  return vacancyInfo;
}
