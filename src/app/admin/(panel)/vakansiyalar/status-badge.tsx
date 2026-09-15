import type { VacancyStatus } from "@/lib/data/vacancies-admin";

/*
  A fill plus a word, never colour alone — the davijara-ui rule, and the
  reason an open vacancy says "Ochiq" rather than just being gold.
*/
export function VacancyStatusBadge({ status }: { status: VacancyStatus }) {
  return (
    <span
      className={
        status === "open"
          ? "bg-accent text-accent-foreground shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold"
          : "border-hairline text-muted-foreground shrink-0 rounded-full border px-2.5 py-0.5 text-xs"
      }
    >
      {status === "open" ? "Ochiq" : "Yopiq"}
    </span>
  );
}
