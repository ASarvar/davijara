import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Newspaper, ShieldAlert } from "lucide-react";

import { FormError } from "@/components/admin/field";
import { recentAudit } from "@/lib/auth/audit";
import { requireUser } from "@/lib/auth/guard";

export const metadata: Metadata = { title: "Boshqaruv" };

export const dynamic = "force-dynamic";

/*
  The dashboard.

  Deliberately thin for now: the two things an editor comes here to do (write
  a news item, edit a page) and, for an admin, what has changed recently. It
  will grow counts as the content tables land — derived from the data, never
  typed in, which is the same rule the public site follows.
*/

const ACTION_LABELS: Record<string, string> = {
  login: "kirdi",
  login_failed: "kirish urinishi",
  logout: "chiqdi",
  create: "yaratdi",
  update: "oʻzgartirdi",
  delete: "oʻchirdi",
  publish: "chop etdi",
  unpublish: "chop etishni bekor qildi",
  restore: "tikladi",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ xato?: string }>;
}) {
  const user = await requireUser();
  const { xato } = await searchParams;

  // Editors never see the audit log; admins see the last twenty entries.
  const entries = user.role === "admin" ? recentAudit(20) : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold">
          Assalomu alaykum, {user.fullName.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Davijara.uz boshqaruv paneli.
        </p>
      </div>

      {/*
        `?xato=ruxsat` is set by requireAdmin() when an editor opens an
        admin-only route. Showing it here is what stops that redirect from
        looking like the link was simply broken.
      */}
      {xato === "ruxsat" ? (
        <FormError>
          Bu boʻlim faqat administratorlar uchun. Kerak boʻlsa, administratorga
          murojaat qiling.
        </FormError>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <QuickLink
          href="/admin/yangiliklar"
          icon={Newspaper}
          title="Yangiliklar"
          description="Yangilik yozish, tahrirlash va chop etish."
        />
        <QuickLink
          href="/admin/sahifalar"
          icon={FileText}
          title="Sahifalar"
          description="Oddiy matnli sahifalar yaratish va tahrirlash."
        />
      </div>

      {user.role === "admin" ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold">Soʻnggi harakatlar</h2>

          {entries.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Hozircha yozuv yoʻq.
            </p>
          ) : (
            <ul className="border-hairline divide-hairline divide-y rounded-lg border">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-4 py-2.5 text-sm"
                >
                  {entry.action === "login_failed" ? (
                    <ShieldAlert
                      aria-hidden="true"
                      className="text-destructive size-3.5 self-center"
                    />
                  ) : null}
                  <span className="font-medium">{entry.username}</span>
                  <span className="text-muted-foreground">
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </span>
                  <span className="text-muted-foreground">
                    — {entry.summary}
                  </span>
                  <time
                    dateTime={entry.at}
                    className="text-muted-foreground ml-auto text-xs tabular-nums"
                  >
                    {formatStamp(entry.at)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="bg-card border-border hover:border-outline group rounded-xl border p-5 [box-shadow:var(--shadow-1)] transition-all hover:-translate-y-0.5 hover:[box-shadow:var(--shadow-2)]"
    >
      <span className="bg-accent text-accent-foreground mb-3 flex size-9 items-center justify-center rounded-lg">
        <Icon className="size-4" />
      </span>
      <p className="font-semibold">{title}</p>
      <p className="text-muted-foreground mt-1 text-sm text-pretty">
        {description}
      </p>
    </Link>
  );
}

/*
  Timestamps in the panel are local-clock, dd.MM.yyyy HH:mm.

  NOT lib/format.ts's formatDate: that one prints a calendar date for a
  citizen reading an announcement. An audit entry needs the time of day, and
  needs it in the reader's own timezone — the column stores UTC, which for an
  operator in Tashkent is five hours behind what their wall clock said when
  they made the change.
*/
function formatStamp(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
