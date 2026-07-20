import { getFaq } from "@/lib/data/catalog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Section, SectionHeader } from "@/components/layout/section";

/**
 * Frequently asked questions.
 *
 * Server-rendered inside a single Accordion, so all six answers are present in
 * the HTML and indexable even while collapsed. The legacy version toggled a
 * `.open` class on a plain div with no ARIA and no keyboard support.
 */
export async function Faq() {
  const items = await getFaq();

  return (
    <Section tone="light">
      <SectionHeader
        eyebrow="Ko'p so'raladigan savollar"
        title="Savollar va javoblar"
      />

      <Accordion type="single" collapsible className="mx-auto max-w-3xl space-y-3">
        {items.map((item, i) => (
          <AccordionItem
            key={item.question}
            value={String(i)}
            className="border-border bg-card rounded-xl border px-5 last:border-b"
          >
            <AccordionTrigger className="text-left text-base font-medium hover:no-underline">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-sm text-pretty">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Section>
  );
}
