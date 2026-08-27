import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronLeft } from "lucide-react";

import { requireAdmin } from "@/lib/auth/guard";
import { auditEntry } from "@/lib/auth/audit";
import { formatStamp } from "../format";

export const metadata: Metadata = { title: "Audit yozuvi" };
export const dynamic = "force-dynamic";

/*
  One audit entry, before and after.

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ FIELD BY FIELD, NOT A JSON DUMP.                                         │
  │                                                                          │
  │ The point of this page is that someone can look at a change to a legal   │
  │ citation and tell, in seconds, exactly which words moved. A pretty-      │
  │ printed blob of JSON with 40 unchanged lines around the one that changed │
  │ does not do that — it is technically complete and practically useless to │
  │ the person who has to decide whether the edit was right.                 │
  │                                                                          │
  │ So the two snapshots are flattened to dotted paths, compared key by key, │
  │ and UNCHANGED FIELDS ARE HIDDEN. What is left is the change itself.      │
  └──────────────────────────────────────────────────────────────────────────┘

  Everything rendered here is a string in a React child, so it is escaped —
  including snapshots of content that was itself editor-supplied. There is no
  `dangerouslySetInnerHTML` on this page and there must not be one: an audit
  view that executes what it is auditing would be a strange way to lose.
*/

/** Flatten nested objects/arrays to `a.b.0.c` → primitive. */
function flatten(
  value: unknown,
  prefix = "",
  out: Map<string, string> = new Map(),
): Map<string, string> {
  if (value === null || value === undefined) {
    if (prefix) out.set(prefix, "—");
    return out;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) out.set(prefix || "(roʻyxat)", "(boʻsh)");
    value.forEach((item, i) => flatten(item, `${prefix}[${i + 1}]`, out));
    return out;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) out.set(prefix || "(obyekt)", "(boʻsh)");
    for (const [key, inner] of entries) {
      flatten(inner, prefix ? `${prefix}.${key}` : key, out);
    }
    return out;
  }

  out.set(prefix || "(qiymat)", String(value));
  return out;
}

export default async function AuditEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();

  const entry = auditEntry(numericId);
  if (!entry) notFound();

  const before = flatten(entry.before);
  const after = flatten(entry.after);

  const keys = [...new Set([...before.keys(), ...after.keys()])].sort();
  const changed = keys.filter((key) => before.get(key) !== after.get(key));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/jurnal"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
        >
          <ChevronLeft className="size-4" />
          Audit jurnali
        </Link>
        <h1 className="font-heading mt-2 text-2xl font-semibold text-pretty">
          {entry.summary}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          <span className="font-medium">{entry.username}</span> ·{" "}
          <time dateTime={entry.at}>{formatStamp(entry.at)}</time> ·{" "}
          {entry.entity}
          {entry.entityId ? ` #${entry.entityId}` : ""}
        </p>
      </div>

      {changed.length === 0 ? (
        <p className="border-hairline text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
          Maydonlarda oʻzgarish qayd etilmagan.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            {changed.length} ta maydon oʻzgargan. Oʻzgarmagan maydonlar
            koʻrsatilmayapti.
          </p>

          <ul className="space-y-3">
            {changed.map((key) => (
              <li
                key={key}
                className="border-border bg-card rounded-lg border p-4"
              >
                <p className="text-muted-foreground mb-3 font-mono text-xs break-all">
                  {key}
                </p>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase">
                      Oldin
                    </p>
                    <p className="border-destructive/30 bg-destructive/5 rounded border px-3 py-2 text-sm break-words whitespace-pre-wrap">
                      {before.get(key) ?? "—"}
                    </p>
                  </div>

                  <ArrowRight
                    aria-hidden="true"
                    className="text-muted-foreground mt-6 hidden size-4 shrink-0 sm:block"
                  />

                  <div>
                    <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase">
                      Keyin
                    </p>
                    <p className="border-outline bg-secondary rounded border px-3 py-2 text-sm break-words whitespace-pre-wrap">
                      {after.get(key) ?? "—"}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
