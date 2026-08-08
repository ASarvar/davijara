import { Construction } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/common/icon-tile";
import { Section } from "./section";

/**
 * Stand-in for sections that exist in the navigation but have no content yet.
 *
 * The legacy site pointed six of eight nav items at `href="#"`. Rather than
 * carry dead links across, each has a real route that renders this — the
 * information architecture is honest, nothing 404s, and each page can be
 * replaced independently as content arrives.
 */
export async function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  const t = await getTranslations("placeholder");

  return (
    <Section tone="deep" className="flex-1">
      <div className="mx-auto max-w-xl py-10 text-center">
        <IconTile size="lg" className="mx-auto mb-6">
          <Construction aria-hidden="true" className="size-7" />
        </IconTile>
        <h1 className="font-heading text-3xl font-semibold sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        <p className="text-muted-foreground mt-4 text-pretty">
          {description ?? t("description")}
        </p>
        <Button asChild className="mt-8">
          <Link href="/">{t("action")}</Link>
        </Button>
      </div>
    </Section>
  );
}
