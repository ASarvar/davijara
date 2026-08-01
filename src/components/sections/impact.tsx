import { getImpactStats } from "@/lib/data/catalog";
import { StatList } from "@/components/common/stat-list";
import { Container } from "@/components/layout/section";

/**
 * Impact band.
 *
 * davijara-v2.html animated these with a JS counter driven by an
 * IntersectionObserver. They are server-rendered text here: the numbers are
 * legible the instant the HTML arrives rather than counting up from zero,
 * they cost no JavaScript, and there is nothing to animate incorrectly for
 * users who have asked for reduced motion. The figures fade up on scroll via
 * the CSS reveal, which is presentation only — the content is never hidden.
 */
export async function Impact() {
  const stats = await getImpactStats();

  return (
    <section
      data-tone="deep"
      className="border-y border-[color:var(--color-gold)]/12 bg-[linear-gradient(90deg,var(--color-navy),var(--color-navy-mid))]"
    >
      <Container className="py-14">
        <StatList stats={stats} align="center" />
      </Container>
    </section>
  );
}
