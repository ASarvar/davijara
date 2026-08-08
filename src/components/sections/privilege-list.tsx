import { getTranslations } from "next-intl/server";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { IconTile } from "@/components/common/icon-tile";
import { SurfaceCard } from "@/components/common/surface-card";
import type { Privilege } from "@/types/content";

/**
 * The 24 statutory privileges, as an accordion.
 *
 * One Accordion wraps the whole list, so there is a single client boundary
 * over server-rendered content rather than 24 independent islands — the
 * distinction matters for INP once every card is interactive.
 *
 * The legacy implementation used `onclick="togglePrivilege(this)"` on a plain
 * div with no ARIA and no keyboard handling: the cards could not be opened
 * with a keyboard at all, and screen readers were given no indication that
 * anything was expandable. Radix supplies the roles, `aria-expanded`, and
 * arrow-key navigation.
 */
export async function PrivilegeList({ items }: { items: Privilege[] }) {
  const t = await getTranslations("privileges");

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground border-border rounded-lg border border-dashed py-12 text-center">
        {t("empty")}
      </p>
    );
  }

  return (
    <Accordion type="multiple" className="space-y-3">
      {items.map((item) => (
        <SurfaceCard
          key={item.id}
          padding="inline"
          interactive
          data-reveal="left"
        >
          <AccordionItem value={String(item.id)} className="border-0">
            <AccordionTrigger className="gap-4 text-left hover:no-underline">
              <span className="flex flex-1 items-start gap-4">
                <IconTile
                  size="sm"
                  aria-hidden="true"
                  className="font-heading text-sm font-semibold"
                >
                  {String(item.id).padStart(2, "0")}
                </IconTile>
                <span className="min-w-0 flex-1">
                  <Badge variant="secondary" className="mb-1.5">
                    {item.tag}
                  </Badge>
                  <span className="block text-base font-semibold text-balance">
                    {item.title}
                  </span>
                </span>
              </span>
            </AccordionTrigger>

            <AccordionContent className="pl-13">
              <p className="text-muted-foreground text-sm text-pretty">
                {item.description}
              </p>

              <dl className="border-border mt-5 grid gap-4 border-t pt-4 sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    {t("subject")}
                  </dt>
                  <dd className="mt-1 text-sm">{item.subject}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    {t("duration")}
                  </dt>
                  <dd className="mt-1 text-sm">{item.duration}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    {t("basis")}
                  </dt>
                  {/*
                    Binding legal citation, reproduced verbatim from the source
                    legislation. Never reword, reformat or translate.
                  */}
                  <dd className="text-accent-foreground mt-1 text-sm font-medium">
                    {item.legalBasis}
                  </dd>
                </div>
              </dl>
            </AccordionContent>
          </AccordionItem>
        </SurfaceCard>
      ))}
    </Accordion>
  );
}
