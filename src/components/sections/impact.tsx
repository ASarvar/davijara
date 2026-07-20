import { getImpactStats } from "@/lib/data/catalog";
import { Container } from "@/components/layout/section";

/**
 * Impact band.
 *
 * davijara-v2.html animated these with a JS counter driven by an
 * IntersectionObserver. They are plain server-rendered text here: the numbers
 * are legible the instant the HTML arrives rather than counting up from zero,
 * they cost no JavaScript, and there is nothing to animate incorrectly for
 * users who have asked for reduced motion.
 */
export async function Impact() {
  const stats = await getImpactStats();

  return (
    <section
      data-tone="deep"
      className="border-y border-[color:var(--color-gold)]/12 bg-[linear-gradient(90deg,var(--color-navy),var(--color-navy-mid))]"
    >
      <Container className="py-14">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="font-heading text-accent-foreground block text-3xl font-semibold sm:text-4xl">
                  {stat.value}
                </span>
                <span className="text-muted-foreground mx-auto mt-2 block max-w-[16rem] text-sm">
                  {stat.label}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
