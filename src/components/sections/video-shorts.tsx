import { getLocale, getTranslations } from "next-intl/server";

import { getVideoShorts, getYoutubeChannelUrl } from "@/lib/data/videos";
import { Section, SectionHeader } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { VideoShortsRow } from "./video-shorts-row";
import { YoutubeIcon } from "@/components/layout/social-links";

/**
 * "Video sharhlar" — the Centre's YouTube Shorts, after the recently-sold
 * strip (operator, 10.11.2026). See lib/data/videos.ts for where the videos
 * come from, and video-shorts-row.tsx for the player they open in.
 *
 * A STATIC ROW, not the drifting CardCarousel the section above uses: two
 * moving rows one under the other would make the page restless, and a video
 * cover is something a reader stops on, not something that should slide
 * past. It scrolls sideways under a finger or a trackpad, snaps to a card
 * edge, and has arrow buttons in place of a scrollbar (ScrollRow); every
 * card is a link, so Tab walks along it too. The row and its player are one
 * client island (video-shorts-row.tsx); the data and strings stay here.
 *
 * Cards are 9:16 — the shape a Short is — at a fixed width, so four and a bit
 * show on a desktop row (the "bit" is what says there is more) and one and a
 * half on a phone.
 */
export async function VideoShorts({
  tone = "deep",
}: {
  tone?: "deep" | "light";
}) {
  const videos = await getVideoShorts(await getLocale());
  // Nothing answered: no heading over an empty row.
  if (videos.length === 0) return null;

  const t = await getTranslations("videos");
  const tCommon = await getTranslations("common");

  return (
    <Section tone={tone}>
      <SectionHeader title={t("title")} description={t("description")} />

      <VideoShortsRow
        videos={videos}
        labels={{
          prev: t("prev"),
          next: t("next"),
          close: tCommon("close"),
          opensOnYoutube: t("opensOnYoutube"),
          watchOnYoutube: t("watchOnYoutube"),
        }}
      />

      <div className="mt-6 flex justify-center">
        <Button asChild>
          <a
            href={getYoutubeChannelUrl()}
            target="_blank"
            rel="noopener noreferrer"
          >
            <YoutubeIcon />
            {t("channel")}
          </a>
        </Button>
      </div>
    </Section>
  );
}
