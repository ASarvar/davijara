import "server-only";

import { featuredShorts, youtubeChannel } from "@/content/videos";
import { translateText } from "@/lib/i18n/content";

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
  const videos = await Promise.all(featuredShorts.map(fetchShort));
  return videos
    .filter((v): v is VideoShort => v !== null)
    .map((v) => ({ ...v, title: translateText(v.title, locale) }));
}

export function getYoutubeChannelUrl(): string {
  return youtubeChannel.url;
}

async function fetchShort(id: string): Promise<VideoShort | null> {
  const href = `https://www.youtube.com/shorts/${id}`;
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(href)}`,
      { signal: AbortSignal.timeout(5_000), next: { revalidate: 86_400 } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: unknown };
    const title = typeof data.title === "string" ? cleanTitle(data.title) : "";
    if (!title) return null;
    return {
      id,
      title,
      href,
      thumbnail: `https://i.ytimg.com/vi/${id}/sddefault.jpg`,
    };
  } catch {
    return null;
  }
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
