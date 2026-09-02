import { getTrafficStats } from "@/lib/data/traffic";

/*
  The current footer figures, for <SiteTrafficLive> to poll once a minute.

  Read-only and never cached — `no-store` at every hop — so "Onlayn" reflects
  the last five minutes rather than whenever the page shell was last
  revalidated. Answers a zeroed object rather than 204/empty when there is no
  data yet, so the client always has a shape to render.

  Not locale-prefixed: src/proxy.ts excludes `api` from its matcher.
*/

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const stats = (await getTrafficStats()) ?? {
    online: 0,
    actions: 0,
    visits: 0,
    avgSeconds: null,
  };
  return Response.json(stats, {
    headers: { "Cache-Control": "no-store" },
  });
}
