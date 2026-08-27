import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, SelectInput } from "@/components/admin/field";
import { requireAdmin } from "@/lib/auth/guard";
import {
  auditUsernames,
  pagedAudit,
  type AuditAction,
  type AuditEntity,
} from "@/lib/auth/audit";
import { formatStamp } from "./format";

export const metadata: Metadata = { title: "Audit jurnali" };
export const dynamic = "force-dynamic";

/*
  The audit log.

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ THIS SCREEN IS WHAT MAKES EDITABLE STATUTORY TEXT DEFENSIBLE.            │
  │                                                                          │
  │ The 24 rent privileges and their PQ-239 / VM-626 citations used to be    │
  │ changeable only through a reviewed git diff. The operator asked for them │
  │ to be editable from the panel; this log is what replaces that review.    │
  │ Every entry keeps the COMPLETE before and after, so a wrong edit is not  │
  │ merely detectable — it is readable, and restorable word for word.        │
  └──────────────────────────────────────────────────────────────────────────┘

  FILTERS LIVE IN THE URL, not React state — the same rule the public site
  follows (CLAUDE.md non-negotiable 3). A filtered view is then linkable, so
  "look at what happened to the privileges page yesterday" is a URL somebody
  can paste into a message.

  Paging is keyset, not offset: see the note in lib/auth/audit.ts.
*/

const ENTITY_LABELS: Record<AuditEntity | "all", string> = {
  all: "Barchasi",
  session: "Kirish/chiqish",
  user: "Foydalanuvchilar",
  news: "Yangiliklar",
  page: "Sahifalar",
  menu: "Menyu",
  privilege: "Imtiyozlar",
  structure: "Tuzilma",
  about: "Markaz haqida",
  duties: "Vazifalar",
  media: "Rasmlar",
};

const ACTION_LABELS: Record<AuditAction | "all", string> = {
  all: "Barchasi",
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

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    bolim?: string;
    amal?: string;
    kim?: string;
    oldin?: string;
  }>;
}) {
  await requireAdmin();

  const sp = await searchParams;
  const entity = (sp.bolim ?? "all") as AuditEntity | "all";
  const action = (sp.amal ?? "all") as AuditAction | "all";
  const username = sp.kim ?? "";
  const before = sp.oldin ? Number(sp.oldin) : undefined;

  const { rows, hasMore } = pagedAudit({
    entity,
    action,
    username: username || undefined,
    before: Number.isFinite(before) ? before : undefined,
  });

  const usernames = auditUsernames();

  /** Carry the active filters into the "next page" link. */
  const nextQuery = new URLSearchParams();
  if (entity !== "all") nextQuery.set("bolim", entity);
  if (action !== "all") nextQuery.set("amal", action);
  if (username) nextQuery.set("kim", username);
  if (rows.length > 0)
    nextQuery.set("oldin", String(rows[rows.length - 1]!.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Audit jurnali</h1>
        <p className="text-muted-foreground mt-1 text-sm text-pretty">
          Kim, qachon, nimani oʻzgartirgani. Oʻzgarishlar toʻliq saqlanadi —
          yozuvni ochib, oldingi holatini koʻrish mumkin.
        </p>
      </div>

      {/*
        A real GET form, no JavaScript. Submitting rewrites the URL, which is
        both the filter and the shareable link.
      */}
      <form className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        {/*
          The panel's own native <select>, not components/common/select-field
          — that one is Radix, a client component, and exists so the public
          search widget's dropdown panel can carry the site's styling. Here a
          native control in a plain GET form is both lighter and sufficient.
        */}
        <Field label="Boʻlim" htmlFor="bolim">
          <SelectInput id="bolim" name="bolim" defaultValue={entity}>
            {(Object.keys(ENTITY_LABELS) as Array<AuditEntity | "all">).map(
              (key) => (
                <option key={key} value={key}>
                  {ENTITY_LABELS[key]}
                </option>
              ),
            )}
          </SelectInput>
        </Field>

        <Field label="Amal" htmlFor="amal">
          <SelectInput id="amal" name="amal" defaultValue={action}>
            {(Object.keys(ACTION_LABELS) as Array<AuditAction | "all">).map(
              (key) => (
                <option key={key} value={key}>
                  {ACTION_LABELS[key]}
                </option>
              ),
            )}
          </SelectInput>
        </Field>

        <Field label="Kim" htmlFor="kim">
          <SelectInput id="kim" name="kim" defaultValue={username}>
            <option value="">Barchasi</option>
            {usernames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Button type="submit" variant="outline">
          Filtrlash
        </Button>
      </form>

      {rows.length === 0 ? (
        <p className="border-hairline text-muted-foreground rounded-lg border border-dashed px-4 py-10 text-center text-sm">
          Bu shartlarga mos yozuv yoʻq.
        </p>
      ) : (
        <ul className="border-hairline divide-hairline divide-y rounded-lg border">
          {rows.map((row) => {
            const body = (
              <>
                {row.action === "login_failed" ? (
                  <ShieldAlert
                    aria-hidden="true"
                    className="text-destructive size-3.5 shrink-0 self-center"
                  />
                ) : null}
                <span className="shrink-0 text-sm font-medium">
                  {row.username}
                </span>
                <span className="text-muted-foreground shrink-0 text-sm">
                  {ACTION_LABELS[row.action] ?? row.action}
                </span>
                <span className="text-muted-foreground min-w-0 flex-1 text-sm text-pretty">
                  {row.summary}
                </span>
                <time
                  dateTime={row.at}
                  className="text-muted-foreground shrink-0 text-xs tabular-nums"
                >
                  {formatStamp(row.at)}
                </time>
              </>
            );

            /*
              Only entries WITH a snapshot are links. A login has nothing to
              open, and a row that looks clickable and then shows an empty
              detail page is worse than a row that does not.
            */
            return (
              <li key={row.id}>
                {row.hasSnapshot ? (
                  <Link
                    href={`/admin/jurnal/${row.id}`}
                    className="hover:bg-muted flex flex-wrap items-baseline gap-x-2 gap-y-1 px-4 py-2.5 transition-colors"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-4 py-2.5">
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {hasMore ? (
        <Button asChild variant="outline">
          <Link href={`/admin/jurnal?${nextQuery.toString()}`}>
            Eskiroq yozuvlar
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
