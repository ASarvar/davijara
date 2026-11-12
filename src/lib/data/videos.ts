import "server-only";

import { featuredShorts, youtubeChannel } from "@/content/videos";
import { translateText } from "@/lib/i18n/content";
import { readSnapshot, saveIfChanged } from "@/lib/data/snapshot";

export type VideoShort = {
  id: string;
  /** As the channel titled it, hashtags removed. */
  title: string;
  /** The Short on YouTube — the link without JavaScript, and "open on YouTube". */
  href: string;
  /** 640×480 cover; a vertical Short sits in its middle, cropped by CSS. */
  thumbnail: string;
};

/*
  Each Short's title from YouTube's public oEmbed endpoint — no key, one
  small JSON per video, cached for a day. A video that fails to answer (made
  private, deleted, YouTube unreachable) is LEFT OUT rather than shown with a
  title we made up; if none answer, the section does not render at all.

  THE PLAYER opens in a dialog on the homepage (video-shorts-row.tsx), and
  only when a reader clicks — until then a card is a cover image (one image
  host, i.ytimg.com, in next.config.ts) and a link, and no YouTube frame or
  script is on the page.

  The cover is `sddefault.jpg` (640×480, ~40 KB): a Short's frame is
  letterboxed in its middle, so a 9:16 crop of it is 270px of real picture
  wide — sharp at card size. `oar2.jpg` is the true vertical frame but
  1080×1920 and ~160 KB each; `hq2.jpg` (oEmbed's own) is 202px wide after
  the crop and soft on a phone. Checked present for all eleven on 10.11.2026.
*/
/*
  `locale`: the titles go through the translators' dictionary
  (lib/i18n/content.ts), keyed by the Uzbek title as YouTube returns it —
  the same route the src/content modules take. A title the dictionary has no
  entry for shows as the channel wrote it, which on /ru is still honest: the
  videos themselves are in Uzbek. The titles are fixed on YouTube itself
  (operator's choice, 10.11.2026), so a corrected title simply arrives here
  within a day; its translation is then added to the workbook under that
  corrected Uzbek text.
*/
export async function getVideoShorts(locale?: string): Promise<VideoShort[]> {
  const stored = readSnapshot<VideoShort[]>(SNAPSHOT_KEY)?.data ?? [];
  const latest = await latestShorts();

  /*
    The feed's newest first, then the last good row — which is what keeps a
    Short on the site once the feed (only the last 15 uploads, long videos
    included) has scrolled past it. With the feed down the row is simply the
    last good one. `featuredShorts` only seeds a server that has never once
    had a good answer.
  */
  const known = stored.length ? stored.map((v) => v.id) : featuredShorts;
  const ids = [...new Set([...latest.map((v) => v.id), ...known])].slice(
    0,
    MAX_SHORTS,
  );
  const storedById = new Map(stored.map((v) => [v.id, v]));
  const titleInFeed = new Map(latest.map((v) => [v.id, v.title]));

  const videos = (
    await Promise.all(
      ids.map(async (id) => {
        // The feed already carries the title, so a Short still in it costs
        // no request of its own; oEmbed is asked only for older ones.
        const title = titleInFeed.get(id);
        if (title) return toShort(id, title);
        const fresh = await fetchShort(id);
        // YouTube unreachable: the Short as it was last seen. Gone (deleted,
        // made private): dropped, not kept alive by the snapshot.
        return fresh === UNREACHABLE ? (storedById.get(id) ?? null) : fresh;
      }),
    )
  ).filter((v): v is VideoShort => v !== null);

  // The Uzbek titles are stored, not the translated ones: the dictionary is
  // applied on the way out, per locale.
  if (videos.length) saveIfChanged(SNAPSHOT_KEY, videos);

  return videos.map((v) => ({ ...v, title: translateText(v.title, locale) }));
}

/*
  NEW SHORTS ARRIVE ON THEIR OWN (operator, 12.11.2026: a Short uploaded the
  day before was not on the site). The channel's public RSS feed — no key —
  lists its last 15 uploads newest first, and a Short's entry links to
  /shorts/{id} where a long video's links to /watch?v=, which is how the two
  are told apart. Checked 12.11.2026: 13 entries, 12 Shorts and one /watch.
  Polled hourly; the homepage itself re-renders every 300 s (locale layout),
  so a new Short shows within the hour. Not a timer: Next refetches only
  when a page is rendered after the hour is up, so at most 24 requests a
  day of ~30 KB. The feed carries each entry's title too, which is what
  spares the per-Short oEmbed call for everything still in it (12.11.2026,
  operator chose this over YouTube's WebSub push, which needs a public
  callback and a subscription renewed every few days).

  WHEN IT FAILS, THE LAST GOOD ROW (operator, 12.11.2026: "eng oxirgi
  muvaffaqiyatli olingan videolar"). The feed answered 404 for every channel
  on 10.11.2026, so any failure — 404, timeout, a feed with no entries —
  gives an empty list here, and getVideoShorts falls back to the row it last
  rendered, kept in `api_snapshot` (lib/data/snapshot.ts) — the database,
  so it survives a restart and a deploy. Unlike a hero figure it is shown
  without an "as of" date: a row of the channel's own videos makes no claim
  about today, and every card still links to the video itself.
*/
const SNAPSHOT_KEY = "youtube:shorts";
/** Enough for three screens of the row. */
const MAX_SHORTS = 24;
const SHORTS_LINK =
  /<link rel="alternate" href="https:\/\/www\.youtube\.com\/shorts\/([A-Za-z0-9_-]{11})"\s*\/>/;
const MEDIA_TITLE = /<media:title>([^<]*)<\/media:title>/;

async function latestShorts(): Promise<Array<{ id: string; title: string }>> {
  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${youtubeChannel.id}`,
      { signal: AbortSignal.timeout(5_000), next: { revalidate: 3_600 } },
    );
    if (!res.ok) return [];
    const xml = await res.text();
    return xml
      .split("<entry>")
      .slice(1)
      .flatMap((entry) => {
        const id = SHORTS_LINK.exec(entry)?.[1];
        if (!id) return [];
        // An empty title here just sends this one Short to oEmbed.
        const raw = MEDIA_TITLE.exec(entry)?.[1] ?? "";
        return [{ id, title: cleanTitle(decodeXml(raw)) }];
      });
  } catch {
    return [];
  }
}

export function getYoutubeChannelUrl(): string {
  return youtubeChannel.url;
}

const UNREACHABLE = Symbol("unreachable");

/*
  A Short's title from oEmbed. Three answers, kept apart because the
  snapshot treats them differently: the Short; null when YouTube says it is
  not there (4xx — deleted, private, never existed), which drops it; and
  UNREACHABLE for a timeout, a network error or a 5xx, where the last good
  copy stands in.
*/
async function fetchShort(
  id: string,
): Promise<VideoShort | null | typeof UNREACHABLE> {
  const href = shortHref(id);
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(href)}`,
      { signal: AbortSignal.timeout(5_000), next: { revalidate: 86_400 } },
    );
    if (res.status >= 500) return UNREACHABLE;
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: unknown };
    const title = typeof data.title === "string" ? cleanTitle(data.title) : "";
    if (!title) return null;
    return toShort(id, title);
  } catch {
    return UNREACHABLE;
  }
}

const shortHref = (id: string) => `https://www.youtube.com/shorts/${id}`;

function toShort(id: string, title: string): VideoShort {
  return {
    id,
    title,
    href: shortHref(id),
    thumbnail: `https://i.ytimg.com/vi/${id}/sddefault.jpg`,
  };
}

/** The five XML entities and numeric references — all a feed title uses. */
function decodeXml(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/*
  Hashtags are YouTube's search plumbing, not part of the title a reader
  needs: "SAVOL - JAVOB | 2-son #тадбиркор #news #uzbekistan …" is shown as
  "SAVOL - JAVOB | 2-son". Nothing else is touched.
*/
function cleanTitle(title: string): string {
  return title
    .replace(/(^|\s)#[^\s#]+/gu, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
