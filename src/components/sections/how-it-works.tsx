import { getTranslations } from "next-intl/server";

import { getSteps } from "@/lib/data/catalog";
import { Icon } from "@/components/icon";
import { Section, SectionHeader } from "@/components/layout/section";

/**
 * "Qanday ijaraga olinadi?" — the four steps, as a journey rather than a grid.
 *
 * Four equal cards said "here are four things"; the section is about ORDER, so
 * the steps now sit on a rail that runs through them — vertical on a phone,
 * horizontal from `lg` — and the rail draws itself as the section scrolls
 * past. That line is the only scroll-LINKED animation on the page besides the
 * hero parallax, and for the same reason: the effect IS the scroll
 * relationship. Everything else on the site triggers and plays on its own
 * clock.
 *
 * The rail is `aria-hidden` and carries no information the text does not:
 * the list is an ordered `<ol>` and each step is numbered in its own heading,
 * so the sequence survives with no CSS, no JavaScript, and a screen reader.
 */
export async function HowItWorks() {
  const t = await getTranslations("steps");
  const steps = await getSteps();

  return (
    <Section tone="light">
      <SectionHeader
        title={t("title")}
        description={t("description")}
      />

      <ol className="relative grid gap-y-10 lg:grid-cols-4 lg:gap-x-8">
        {/*
          The rail. Sits behind the nodes at their centre line: `top-7` is half
          of the size-14 node, so the track passes exactly through the middle of
          every one of them at any breakpoint.
        */}
        <div
          aria-hidden="true"
          className="border-hairline pointer-events-none absolute top-7 bottom-7 left-7 w-px border-l lg:top-7 lg:right-0 lg:bottom-auto lg:left-0 lg:h-px lg:w-auto lg:border-t lg:border-l-0"
        >
          {/* Fills along the track as the section scrolls through. */}
          <span
            data-draw
            className="step-rail-fill bg-ring absolute inset-0 block"
          />
        </div>

        {steps.map((step) => (
          <li
            key={step.number}
            data-reveal="left"
            className="group relative pl-20 lg:pl-0"
          >
            {/*
              The node. `z-10` lifts it over the rail so the line appears to
              pass behind it rather than through it.

              Its own background stays `bg-background` — opaque — at every
              state, hover included. The gold tint is a SEPARATE child layer
              painted on top, not a swap of the node's own background-color.

              That split matters: `--accent` is a translucent token (18% alpha
              on this light tone, see globals.css), by design — it is meant to
              tint a surface it sits on, not to BE the surface. Swapping the
              node's own background to `bg-accent` on hover made the node
              itself 18% opaque, and the rail line directly behind it showed
              straight through the gold tint. Layering the tint as a child
              keeps the node's own background solid underneath it, so nothing
              behind the node can ever show through, regardless of the tint's
              alpha.
            */}
            {/*
              `lg:relative`, not `lg:static`. At `lg` this node still needs to
              be a positioned ancestor: the tint span below is `absolute
              inset-0`, and an absolutely positioned element sizes itself to
              the nearest POSITIONED ancestor's box — `static` does not count.
              With `lg:static` the tint escaped past this node to the next
              positioned ancestor up, the `<li>`, and inset-0'd to the FULL
              step (260×152 measured, instead of the 56×56 icon circle),
              tinting gold across the whole card on hover rather than the
              icon. `relative` with explicit `top-0 left-0` offsets keeps it
              visually identical to `static` — still in normal flow, zero
              offset from where it would sit anyway — while still anchoring
              the tint to the circle.
            */}
            <span
              aria-hidden="true"
              className="border-hairline bg-background text-accent-foreground group-hover:border-ring absolute top-0 left-0 z-10 flex size-14 items-center justify-center rounded-full border transition-[border-color,transform,box-shadow] duration-[350ms] ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-black/5 lg:relative"
            >
              <span
                aria-hidden="true"
                className="bg-accent absolute inset-0 -z-10 rounded-full opacity-0 transition-opacity duration-[350ms] ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:opacity-100"
              />
              <Icon
                name={step.icon}
                className="size-6 transition-transform duration-[350ms] ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-110"
              />
            </span>

            <div className="lg:mt-6">
              {/*
                The numeral is part of the heading, not a decorative overlay in
                the corner. Sighted readers get the order from the rail; this is
                what gives it to everyone else.
              */}
              <h3 className="flex items-baseline gap-2.5 text-base font-semibold">
                {/*
                  `text-muted-foreground`, not a faded accent. At
                  `text-accent-foreground/45` this measured 1.89:1 on the light
                  surface — fine for the decorative corner numeral it used to
                  be, not fine now that it sits in the heading and is the only
                  place the step order is written down.
                */}
                <span className="font-heading text-muted-foreground group-hover:text-accent-foreground text-sm tabular-nums transition-colors duration-[350ms]">
                  {step.number}
                </span>
                <span className="group-hover:text-accent-foreground transition-colors duration-[350ms]">
                  {step.title}
                </span>
              </h3>
              <p className="text-muted-foreground mt-2 max-w-xs text-sm">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}
