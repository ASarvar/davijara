import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/guard";
import { getAbout } from "@/lib/data/about";
import { getDuties } from "@/lib/data/duties";
import { documentUpdatedAt } from "@/lib/data/documents";
import {
  DOCUMENT_KEYS,
  DOCUMENT_LABELS,
  DOCUMENT_PATHS,
  type DocumentKey,
} from "@/types/documents";
import { AboutEditor } from "../about-editor";
import { DutiesEditor } from "../duties-editor";

export const metadata: Metadata = { title: "Huquqiy matn" };
export const dynamic = "force-dynamic";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  await requireAdmin();

  const { key } = await params;
  if (!DOCUMENT_KEYS.includes(key as DocumentKey)) notFound();
  const documentKey = key as DocumentKey;

  /*
    Loaded through the PUBLIC data layer, not straight from the documents
    table. That is what makes the editor show the seed text when the database
    row is missing — an admin on a freshly restored backup then edits the last
    known-good transcription rather than an empty form, and saving puts it
    back. See the fallback note in lib/data/about.ts.
  */
  const updatedAt = documentUpdatedAt(documentKey);
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/hujjatlar"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
        >
          <ChevronLeft className="size-4" />
          Huquqiy matnlar
        </Link>
        <h1 className="font-heading mt-2 text-2xl font-semibold">
          {DOCUMENT_LABELS[documentKey]}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm text-pretty">
          Saqlangandan soʻng saytda darhol koʻrinadi. Har bir oʻzgarish audit
          jurnaliga toʻliq yoziladi.
          {updatedAt
            ? ` Oxirgi oʻzgarish: ${updatedAt.slice(0, 10)}.`
            : " Hozircha panelda tahrirlanmagan."}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline" size="sm">
          <a
            href={`${base}/uz/${DOCUMENT_PATHS[documentKey]}`}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink />
            Saytda koʻrish
          </a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/jurnal?bolim=${documentKey}`}>
            Oʻzgarishlar tarixi
          </Link>
        </Button>
      </div>

      {documentKey === "about" ? (
        <AboutEditor initial={await getAbout()} />
      ) : (
        <DutiesEditor initial={await getDuties()} />
      )}
    </div>
  );
}
