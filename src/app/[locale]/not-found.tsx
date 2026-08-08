import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/layout/section";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <Section tone="deep" className="flex-1">
      <div className="mx-auto max-w-xl py-16 text-center">
        <p className="text-accent-foreground font-heading text-6xl font-semibold">
          404
        </p>
        <h1 className="font-heading mt-4 text-3xl font-semibold sm:text-4xl lg:text-5xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-4 text-pretty">
          {t("description")}
        </p>
        <Button asChild className="mt-8">
          <Link href="/">{t("action")}</Link>
        </Button>
      </div>
    </Section>
  );
}
