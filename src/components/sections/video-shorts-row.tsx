"use client";

import { useState } from "react";
import { ExternalLink, Play, X } from "lucide-react";

import type { VideoShort } from "@/lib/data/videos";
import { ScrollRow } from "@/components/common/scroll-row";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

/*
  The Shorts row and the player it opens (operator, 10.11.2026: a video
  plays in a window over the page, not on YouTube).

  THE PLAYER LOADS ONLY ON A CLICK. Until then the row is cover images and
  links; the <iframe> exists only while the dialog is open, so YouTube's
  player — and whatever it sends to Google — reaches nobody who did not ask
  to watch. It is the `youtube-nocookie.com` player, which sets no cookies
  until playback; CSP frame-src names that host and nothing else of
  YouTube's (next.config.ts). Closing the dialog unmounts the frame, which is
  also what stops the sound.

  PROGRESSIVE: each card is still a real link to the Short on YouTube. With
  no JavaScript it opens there; with it, a plain click opens the dialog,
  while Ctrl/Cmd/Shift/middle-click keep the browser's own "open in a new
  tab", which a reader asking for that should get.

  Strings come in as props from the server component, so this island needs
  no message namespace of its own (see clientMessages in the locale layout).
*/
export function VideoShortsRow({
  videos,
  labels,
}: {
  videos: VideoShort[];
  labels: {
    prev: string;
    next: string;
    close: string;
    opensOnYoutube: string;
    watchOnYoutube: string;
  };
}) {
  const [active, setActive] = useState<VideoShort | null>(null);

  return (
    <>
      <ScrollRow
        labels={{ prev: labels.prev, next: labels.next }}
        // The arrows on the middle of the PICTURE, not of picture + title:
        // a card is 11.5rem (13rem from sm) wide at 9:16.
        controlsClassName="top-0 h-[calc(11.5rem*16/9)] sm:h-[calc(13rem*16/9)]"
        listClassName="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:scroll-px-8 sm:px-8"
      >
        {videos.map((video) => (
          <li
            key={video.id}
            data-reveal="up"
            className="w-[11.5rem] shrink-0 snap-start sm:w-[13rem]"
          >
            <a
              href={video.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => {
                if (
                  event.button !== 0 ||
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                ) {
                  return;
                }
                event.preventDefault();
                setActive(video);
              }}
              className="group focus-visible:ring-ring block rounded-lg focus-visible:ring-2 focus-visible:outline-none"
            >
              <span className="border-hairline bg-muted relative block aspect-[9/16] overflow-hidden rounded-lg border [box-shadow:var(--shadow-1)] transition-[box-shadow] duration-300 group-hover:[box-shadow:var(--shadow-2)]">
                {/* eslint-disable-next-line @next/next/no-img-element -- remote cover on YouTube's image host; see lib/data/videos.ts. */}
                <img
                  src={video.thumbnail}
                  alt=""
                  width={640}
                  height={480}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
                {/*
                  Small, in the BOTTOM-LEFT corner: centred and 48px it sat
                  on the speaker's face in most covers, and that corner is
                  the one a Short's own captions leave clear. Fixed
                  white-on-black because it sits on a photograph, whose
                  colours no theme token knows.
                */}
                <span
                  aria-hidden="true"
                  className="absolute bottom-2.5 left-2.5 flex size-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-transform duration-300 group-hover:scale-110"
                >
                  <Play className="size-3.5 translate-x-px fill-current" />
                </span>
              </span>
              <span className="group-hover:text-accent-foreground mt-3 line-clamp-2 block text-sm font-medium text-pretty transition-colors">
                {video.title}
              </span>
            </a>
          </li>
        ))}
      </ScrollRow>

      <Dialog
        open={active !== null}
        onOpenChange={(open) => {
          if (!open) setActive(null);
        }}
      >
        {active ? (
          <DialogContent
            showCloseButton={false}
            aria-describedby={undefined}
            /*
              Sized from the HEIGHT: a Short is 9:16, so the frame is as tall
              as the window allows (less room for the caption) and its width
              follows; on a narrow phone the width caps it instead.
            */
            className="bg-card w-[min(92vw,calc((100dvh-10rem)*9/16))] max-w-none gap-0 overflow-visible p-0 sm:max-w-none"
          >
            <DialogClose
              aria-label={labels.close}
              className="absolute -top-11 right-0 flex size-9 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            >
              <X aria-hidden="true" className="size-5" />
            </DialogClose>
            <div className="aspect-[9/16] w-full overflow-hidden rounded-t-xl bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${active.id}?autoplay=1&playsinline=1&rel=0`}
                title={active.title}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="size-full border-0"
              />
            </div>
            <div className="flex items-start justify-between gap-3 p-3">
              <DialogTitle className="line-clamp-2 text-sm font-semibold text-pretty">
                {active.title}
              </DialogTitle>
              <a
                href={active.href}
                target="_blank"
                rel="noopener noreferrer"
                title={labels.watchOnYoutube}
                className="text-muted-foreground hover:text-accent-foreground flex shrink-0 items-center gap-1 text-xs transition-colors"
              >
                {labels.watchOnYoutube}
                <ExternalLink aria-hidden="true" className="size-3.5" />
                <span className="sr-only"> — {labels.opensOnYoutube}</span>
              </a>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}
