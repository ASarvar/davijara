import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { type Locale } from "@/i18n/routing";
import { getPageByPath } from "@/lib/data/pages";
import { BlockContent } from "@/components/common/block-content";
import { Section } from "@/components/layout/section";
import { setRequestLocale } from "next-intl/server";

/*
  Pages invented in the admin panel, at paths no route file covers.

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ THIS IS THE LOWEST-PRIORITY ROUTE ON THE SITE, AND THAT IS THE DESIGN.   │
  │                                                                          │
  │ Next resolves static segments before dynamic ones and a catch-all last,  │
  │ so this file only ever runs for a URL that matched nothing else. It      │
  │ cannot shadow /obyektlar, /imtiyozlar, the 26 section pages, or anything │
  │ added later — which is what makes it safe to let an editor choose a      │
  │ path at all.                                                             │
  │                                                                          │
  │ The other half of that safety is in page-routes.ts: the panel refuses a  │
  │ path whose first segment belongs to a real route, because such a page    │
  │ would save successfully and then never appear, with nothing to say why.  │
  │ Here the consequence would be invisible; there it is an error message.   │
  └──────────────────────────────────────────────────────────────────────────┘

  It also handles every 404 on the site now, since an unmatched URL reaches
  here first. `notFound()` hands those straight back to the normal not-found
  handling, so nothing about that changes.

  NOT prerendered: no `generateStaticParams`, because the set of paths lives
  in a database the build must not open (see lib/db/index.ts). Rendered on
  first request, then cached for the window below; the panel's publish action
  clears it immediately.
*/

export const revalidate = 300;

/** `["markaz", "yangi"]` → `"markaz/yangi"`, matching what the database stores. */
function toPath(slug: string[]): string {
  return slug.map(decodeURIComponent).join("/");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string[] }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = await getPageByPath(toPath(slug), locale);
  if (!page) return {};

  return {
    title: page.title,
    description: page.description || undefined,
  };
}

export default async function CustomPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string[] }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale as Locale);

  const page = await getPageByPath(toPath(slug), locale);
  if (!page) notFound();

  return (
    <Section tone="deep" className="flex-1">
      {/*
        `mx-auto` centers the whole reading column in the 1200px container —
        without it this max-w-3xl div sits flush against the left edge, which
        is what read as the page "not filling" its container. The title is
        centered as its own masthead line; the body stays left-aligned, same
        as markaz/page.tsx and markaz/vazifalar/page.tsx, because centering
        running prose hurts readability rather than helping it.
      */}
      <div className="mx-auto max-w-3xl">
        <h1
          data-split
          className="font-heading text-center text-2xl font-semibold text-balance sm:text-3xl lg:text-4xl"
        >
          {page.title}
        </h1>
        <BlockContent blocks={page.blocks} className="mt-2" />
      </div>
    </Section>
  );
}
