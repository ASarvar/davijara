"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Pause,
  Play,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";

import { usePathname } from "@/i18n/navigation";
import { withBasePath } from "@/lib/base-path";
import { cn } from "@/lib/utils";
import {
  splitIntoChunks,
  TTS_BLOCK_SELECTOR,
  TTS_BLOCK_TAGS,
} from "@/lib/tts/chunks";
import { isTtsLocale, type TtsVoice } from "@/lib/tts/voices";

/*
  "Matnni o'qib berish" — the page read aloud, block by block.

  NOT A REPLACEMENT FOR A SCREEN READER, and the distinction decides the
  design. Someone running NVDA or VoiceOver already has the page, and gets it
  better than this could: the headings, the landmarks, the tables, the links.
  This is for the reader who does not run one — low vision, tired eyes, poor
  literacy, a long statute — and it is therefore an ordinary audio player with
  ordinary controls, not an accessibility layer competing with theirs. It
  never starts by itself, it is reachable by keyboard like any other control,
  and turning it off leaves no trace on the page.

  IT READS THE PAGE'S OWN PROSE, in document order: the headings, paragraphs
  and list items inside <main>. Nav, footer and controls are not read —
  hearing the whole menu before the first sentence is how these players get
  turned off — and neither are tables, which are for reading.

  THE AUDIO IS NOT MADE HERE. `/api/tts` holds the key, checks that the words
  are actually on the page it was told, and caches the result, so a paragraph
  of the rent statute is synthesised once for the whole site. See
  lib/tts/azure.ts.
*/

/*
  A piece of text to speak, and the block it came from.

  `el` IS NULL FOR A SELECTION. Reading the whole page walks block elements,
  so each chunk has one to highlight and scroll to; a reader who has selected
  a phrase has already marked it themselves, and the browser's own selection
  is a better highlight than anything painted over it.
*/
type Chunk = { text: string; el: HTMLElement | null };
type Status = "idle" | "loading" | "playing" | "paused" | "error";

/*
  WHO IS DOING THE SPEAKING.

  `server` is the real answer: Azure, through /api/tts, which is the only one
  of the three that can say an Uzbek sentence properly.

  `browser` is the fallback for a deployment with no speech service
  configured. It costs nothing and needs no key, but it can only offer what
  the reader's own device has installed — and no desktop browser ships an
  Uzbek voice, so in practice it serves /ru and /en and says so plainly on
  /uz rather than pretending.

  `none` is not hidden. A control that is switched on and then does nothing
  visible is indistinguishable from a broken one, so the bar still appears and
  carries the reason.
*/
type Engine = "server" | "browser" | "none";

/** The device's own voices for a locale, if it has any. */
function browserVoices(locale: string): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window))
    return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith(locale.toLowerCase()));
}

/*
  The voice list arrives asynchronously in Chromium — `getVoices()` is empty
  on the first call and fills in behind a `voiceschanged` event — so a check
  made too early would report a device with voices as having none.
*/
function whenVoicesReady(): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window))
    return Promise.resolve();
  if (window.speechSynthesis.getVoices().length > 0) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => resolve();
    window.speechSynthesis.addEventListener("voiceschanged", done, {
      once: true,
    });
    setTimeout(done, 1500);
  });
}

const VOICE_KEY = "davijara-read-aloud-voice";
const READING_CLASS = "tts-reading";
/*
  How much clear space the selection button needs above the selection before it
  is put there: its own height, plus the sticky header it would cover.
*/
const SELECTION_BUTTON_HEADROOM = 120;

/**
 * The blocks of the current page, in the order they are written.
 *
 * A block that CONTAINS another block is skipped — a <li> wrapping a <p>
 * would otherwise be read once as itself and once as its child — and so is
 * anything hidden, aria-hidden, or marked `data-tts-skip`.
 */
function collectChunks(): Chunk[] {
  const chunks: Chunk[] = [];

  for (const el of document.querySelectorAll<HTMLElement>(TTS_BLOCK_SELECTOR)) {
    if (el.querySelector(TTS_BLOCK_TAGS)) continue;
    if (el.closest("[data-tts-skip]")) continue;
    if (el.closest("[aria-hidden='true']")) continue;
    /*
      Navigation inside the content is still navigation. The filter chips on
      /imtiyozlar are an <li> list in a <nav>, so a reading that took every
      list item began "Barchasi 24, Ijtimoiy himoya 8, Ta'lim muassasalari 4"
      before reaching a sentence. Links themselves are kept — a card's title
      is a link and is very much part of the page.
    */
    if (el.closest("nav, button, [role='tablist']")) continue;
    // `offsetParent` is null for a display:none subtree, which is how the
    // mobile/desktop duplicates in the header and the closed <details> of the
    // vacancy list stay out of the reading.
    if (!el.offsetParent) continue;

    const text = el.innerText?.trim();
    if (!text) continue;

    for (const piece of splitIntoChunks(text)) chunks.push({ text: piece, el });
  }

  return chunks;
}

export function ReadAloud() {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();

  const [enabled, setEnabled] = useState(false);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  /*
    READ IN THE INITIALISER, which is safe here and would not be in most
    components: until the effect below finds `data-read-aloud` on <html> this
    component renders null, so the server output does not depend on this value
    and there is nothing for hydration to disagree with. The `window` guard is
    for the server pass itself, where localStorage does not exist.
  */
  const [voice, setVoice] = useState<TtsVoice>(() => {
    if (typeof window === "undefined") return "female";
    try {
      const saved = localStorage.getItem(VOICE_KEY);
      return saved === "male" || saved === "female" ? saved : "female";
    } catch {
      // Privacy mode: the default voice is used and nothing is remembered.
      return "female";
    }
  });
  const [position, setPosition] = useState({ index: 0, total: 0 });
  const [selection, setSelection] = useState<{
    text: string;
    top: number;
    bottom: number;
    left: number;
  } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Chunk[]>([]);
  const indexRef = useRef(0);
  const urlsRef = useRef(new Map<number, string>());
  const nextRef = useRef<{ index: number; promise: Promise<string> } | null>(
    null,
  );
  /*
    `play` calls itself when a browser utterance ends, and an utterance's
    callback outlives the render that created it. The ref is what keeps that
    call pointed at the current closure instead of the one from four
    paragraphs ago.
  */
  const playRef = useRef<(index: number) => void>(() => {});

  /*
    The preference lives on <html>, set before paint by AccessibilityScript
    and toggled by AccessibilityControls — the same mechanism as contrast and
    text size, so all three survive a navigation the same way.
  */
  useEffect(() => {
    const read = () =>
      setEnabled(
        document.documentElement.getAttribute("data-read-aloud") === "on",
      );
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-read-aloud"],
    });
    return () => observer.disconnect();
  }, []);

  /*
    What the reader has selected, and where it is on the screen.

    ONLY WHILE THE FEATURE IS ON: a button that appeared beside every
    selection would interrupt copying an address for every visitor, most of
    whom never asked to be read to.

    Coalesced into a frame, because `selectionchange` fires continuously while
    a selection is dragged, and re-measured on scroll and resize so the button
    stays on the words it belongs to.
  */
  useEffect(() => {
    /*
      Nothing to clear on the way out: with the feature off the component
      renders null, so a selection remembered here is invisible, and the
      immediate `read()` below corrects it the moment it is switched back on.
    */
    if (!enabled) return;

    let frame = 0;
    const read = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const sel = window.getSelection();
        const main = document.querySelector("main");
        if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !main) {
          setSelection(null);
          return;
        }

        const text = sel.toString().trim();
        const range = sel.getRangeAt(0);
        const node =
          range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
            ? (range.commonAncestorContainer as Element)
            : range.commonAncestorContainer.parentElement;

        // Inside the page's own content, and not inside the player itself.
        if (
          text.length < 2 ||
          !node ||
          !main.contains(node) ||
          node.closest("[data-tts-skip]")
        ) {
          setSelection(null);
          return;
        }

        const rect = range.getBoundingClientRect();
        setSelection({
          text,
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left + rect.width / 2,
        });
      });
    };

    read();
    document.addEventListener("selectionchange", read);
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("selectionchange", read);
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, [enabled]);

  /*
    Asked once, and only once the reader has turned the feature on — there is
    no reason to wake a speech service for someone who has not.
  */
  useEffect(() => {
    if (!enabled || engine !== null) return;
    let active = true;

    void (async () => {
      let served = false;
      try {
        const res = await fetch(
          withBasePath(`/api/tts?locale=${encodeURIComponent(locale)}`),
        );
        if (res.ok) {
          const data: { available?: boolean } = await res.json();
          served = Boolean(data.available);
        }
      } catch {
        // Offline, or the route is not deployed. Fall through to the device.
      }
      if (!active) return;
      if (served) {
        setEngine("server");
        return;
      }

      await whenVoicesReady();
      if (!active) return;
      setEngine(browserVoices(locale).length > 0 ? "browser" : "none");
    })();

    return () => {
      active = false;
    };
  }, [enabled, engine, locale]);

  const clearHighlight = useCallback(() => {
    for (const el of document.querySelectorAll(`.${READING_CLASS}`)) {
      el.classList.remove(READING_CLASS);
    }
  }, []);

  const releaseAudio = useCallback(() => {
    for (const url of urlsRef.current.values()) URL.revokeObjectURL(url);
    urlsRef.current.clear();
    nextRef.current = null;
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    chunksRef.current = [];
    indexRef.current = 0;
    releaseAudio();
    clearHighlight();
    setPosition({ index: 0, total: 0 });
    setStatus("idle");
  }, [clearHighlight, releaseAudio]);

  // A new page is a new text. Nothing carries over except the preference.
  useEffect(() => stop, [pathname, stop]);

  /*
    SPEECH OUTLIVES THE PAGE. `speechSynthesis` belongs to the browser, not to
    the document: an utterance queued here keeps speaking through a full
    navigation, and React's cleanup does not run on one. So the queue is
    cleared on the way out, and again on the way in — a reader who leaves
    mid-paragraph should not be read the previous page by the next one.
  */
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const cancel = () => window.speechSynthesis.cancel();
    window.addEventListener("pagehide", cancel);
    return () => {
      window.removeEventListener("pagehide", cancel);
      cancel();
    };
  }, []);

  const fetchChunk = useCallback(
    async (index: number): Promise<string> => {
      const cached = urlsRef.current.get(index);
      if (cached) return cached;

      const chunk = chunksRef.current[index];
      const res = await fetch(withBasePath("/api/tts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: window.location.pathname,
          text: chunk.text,
          locale: isTtsLocale(locale) ? locale : "uz",
          voice,
        }),
      });
      if (!res.ok) throw new Error(`tts ${res.status}`);

      const url = URL.createObjectURL(await res.blob());
      /*
        Only a short tail is kept. A long page is hundreds of chunks, and a
        browser holding every blob would be holding the whole reading in
        memory for a reader who is unlikely to go back more than a paragraph.
      */
      urlsRef.current.set(index, url);
      for (const [key, value] of urlsRef.current) {
        if (key < index - 3) {
          URL.revokeObjectURL(value);
          urlsRef.current.delete(key);
        }
      }
      return url;
    },
    [locale, voice],
  );

  const play = useCallback(
    async (index: number) => {
      const chunks = chunksRef.current;
      if (index < 0 || index >= chunks.length) {
        stop();
        return;
      }

      indexRef.current = index;
      setPosition({ index, total: chunks.length });
      clearHighlight();

      const { el } = chunks[index];
      if (el) {
        el.classList.add(READING_CLASS);
        el.scrollIntoView({
          block: "center",
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
        });
      }

      /*
        The device's own voice: no request, no cache, no prefetch — the
        utterance IS the audio. Male and female map onto the first two voices
        the platform lists for the locale, because a voice's gender is not
        something the Web Speech API reports; where it lists only one, both
        buttons land on it.
      */
      if (engine === "browser") {
        try {
          const utterance = new SpeechSynthesisUtterance(chunks[index].text);
          const voices = browserVoices(locale);
          const picked = voices[voice === "male" && voices.length > 1 ? 1 : 0];
          if (picked) {
            utterance.voice = picked;
            utterance.lang = picked.lang;
          }
          utterance.onend = () => {
            if (indexRef.current === index) playRef.current(index + 1);
          };
          utterance.onerror = () => setStatus("error");

          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
          setStatus("playing");
        } catch {
          clearHighlight();
          setStatus("error");
        }
        return;
      }

      try {
        setStatus("loading");
        const url =
          nextRef.current?.index === index
            ? await nextRef.current.promise
            : await fetchChunk(index);

        const audio = audioRef.current;
        if (!audio || indexRef.current !== index) return;
        audio.src = url;
        await audio.play();
        setStatus("playing");

        // The next block is fetched while this one is still speaking, so the
        // gap between paragraphs is the service's latency and not the
        // reader's wait.
        if (index + 1 < chunks.length) {
          nextRef.current = {
            index: index + 1,
            promise: fetchChunk(index + 1),
          };
          void nextRef.current.promise.catch(() => {
            nextRef.current = null;
          });
        }
      } catch {
        clearHighlight();
        setStatus("error");
      }
    },
    [clearHighlight, engine, fetchChunk, locale, stop, voice],
  );

  useEffect(() => {
    playRef.current = play;
  }, [play]);

  const start = useCallback(() => {
    const chunks = collectChunks();
    chunksRef.current = chunks;
    releaseAudio();

    if (chunks.length === 0) {
      setStatus("error");
      return;
    }
    void play(0);
  }, [play, releaseAudio]);

  /*
    The reader's own selection, read on request.

    A BUTTON, NOT A REFLEX. Speaking on selection alone would talk over every
    accidental double-click and every attempt to copy an address — and the
    whole feature's first rule is that it never starts by itself. The button
    appears beside the selection while the feature is switched on, and the bar
    offers the same action for anyone not using a mouse.

    The selection is chunked like any other text, so a selected page's worth
    of statute is spoken in order rather than refused for being too long.
  */
  const speakSelection = useCallback(() => {
    const raw = selection?.text.trim();
    if (!raw) return;

    const pieces = splitIntoChunks(raw);
    if (pieces.length === 0) return;

    releaseAudio();
    clearHighlight();
    chunksRef.current = pieces.map((text) => ({ text, el: null }));
    void play(0);
  }, [clearHighlight, play, releaseAudio, selection]);

  const toggle = useCallback(() => {
    if (engine === "browser") {
      if (status === "playing") {
        window.speechSynthesis.pause();
        setStatus("paused");
        return;
      }
      if (status === "paused") {
        window.speechSynthesis.resume();
        setStatus("playing");
        return;
      }
      start();
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    if (status === "playing") {
      audio.pause();
      setStatus("paused");
      return;
    }
    if (status === "paused") {
      void audio.play().then(() => setStatus("playing"));
      return;
    }
    start();
  }, [engine, start, status]);

  const step = useCallback(
    (delta: number) => {
      if (chunksRef.current.length === 0) return;
      void play(indexRef.current + delta);
    },
    [play],
  );

  const chooseVoice = useCallback(
    (next: TtsVoice) => {
      setVoice(next);
      try {
        localStorage.setItem(VOICE_KEY, next);
      } catch {
        // See above.
      }
      // Everything cached was spoken by the other voice.
      releaseAudio();
      if (status === "playing" || status === "paused") {
        audioRef.current?.pause();
        setStatus("idle");
      }
    },
    [releaseAudio, status],
  );

  useEffect(() => releaseAudio, [releaseAudio]);

  const active = enabled && engine !== null;

  /*
    Tells the stylesheet to reserve room at the foot of the page. Keyed off
    the player actually BEING there rather than off the preference: with no
    speech service configured the bar never renders, and a strip of empty
    space at the bottom of every page would be the only sign of it.
  */
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    root.setAttribute("data-read-aloud-active", "");
    return () => root.removeAttribute("data-read-aloud-active");
  }, [active]);

  if (!active) return null;

  const playing = status === "playing";
  const busy = status === "loading";
  /*
    One voice on the device means the male/female choice is a lie, so it is
    not offered. The server engine always has both.
  */
  const offerVoices = engine === "server" || browserVoices(locale).length > 1;

  return (
    <>
      {/*
        The button beside a selection.

        `onMouseDown` IS PREVENTED, and without that line this button cannot
        be clicked at all: pressing anywhere outside a selection collapses it,
        `selectionchange` fires, and the button unmounts before the click
        lands on it.

        Positioned in viewport coordinates because the rectangle it follows is
        measured that way; clamped so a selection at the very edge of a phone
        screen does not push it off.
      */}
      {selection ? (
        <button
          type="button"
          data-tts-skip
          onMouseDown={(event) => event.preventDefault()}
          onClick={speakSelection}
          style={{
            /*
              Above the selection, or below it when the selection starts too
              near the top of the screen — the header is sticky, and a button
              pinned to the top of the viewport lands on the navigation.
            */
            top:
              selection.top > SELECTION_BUTTON_HEADROOM
                ? selection.top - 44
                : selection.bottom + 8,
            left: Math.min(
              Math.max(selection.left, 90),
              window.innerWidth - 90,
            ),
          }}
          className="border-outline bg-card text-accent-foreground focus-visible:ring-ring fixed z-[950] flex -translate-x-1/2 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold [box-shadow:var(--shadow-2)] focus-visible:ring-2 focus-visible:outline-none"
        >
          <Volume2 aria-hidden="true" className="size-3.5" />
          {t("readAloudSelection")}
        </button>
      ) : null}

      {/*
        `data-tts-skip` on the player itself: it is inside no <main>, but the
        rule is cheap and the day someone moves it is not the day to rediscover
        why the reading began with the word "Pauza".
      */}
      <div
        data-tts-skip
        data-tone="deep"
        /* Above the mobile bottom nav, which is itself fixed and 4rem tall. */
        className="bg-card border-border fixed inset-x-0 bottom-16 z-[900] border-t [box-shadow:var(--shadow-2)] lg:bottom-0"
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2.5 sm:gap-3">
          <span className="text-accent-foreground flex items-center gap-2 text-sm font-semibold">
            <Volume2 aria-hidden="true" className="size-4" />
            {t("readAloud")}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => step(-1)}
              disabled={status === "idle" || position.index === 0}
              className="border-border hover:bg-secondary focus-visible:ring-ring rounded-lg border p-2 transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40"
            >
              <SkipBack aria-hidden="true" className="size-4" />
              <span className="sr-only">{t("readAloudPrev")}</span>
            </button>

            <button
              type="button"
              onClick={toggle}
              disabled={busy || engine === "none"}
              className="border-outline bg-accent text-accent-foreground focus-visible:ring-ring rounded-lg border px-3 py-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
            >
              {playing ? (
                <Pause aria-hidden="true" className="size-4" />
              ) : (
                <Play aria-hidden="true" className="size-4" />
              )}
              <span className="sr-only">
                {playing ? t("readAloudPause") : t("readAloudStart")}
              </span>
            </button>

            <button
              type="button"
              onClick={() => step(1)}
              disabled={
                status === "idle" || position.index + 1 >= position.total
              }
              className="border-border hover:bg-secondary focus-visible:ring-ring rounded-lg border p-2 transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40"
            >
              <SkipForward aria-hidden="true" className="size-4" />
              <span className="sr-only">{t("readAloudNext")}</span>
            </button>

            <button
              type="button"
              onClick={stop}
              disabled={status === "idle"}
              className="border-border hover:bg-secondary focus-visible:ring-ring rounded-lg border p-2 transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40"
            >
              <Square aria-hidden="true" className="size-4" />
              <span className="sr-only">{t("readAloudStop")}</span>
            </button>
          </div>

          <div
            className={cn(
              "flex items-center gap-1.5",
              !offerVoices && "hidden",
            )}
          >
            {(
              [
                ["female", "readAloudVoiceFemale"],
                ["male", "readAloudVoiceMale"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => chooseVoice(value)}
                aria-pressed={voice === value}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
                  voice === value
                    ? "border-outline bg-accent text-accent-foreground font-semibold"
                    : "border-border hover:bg-secondary",
                )}
              >
                {t(label)}
              </button>
            ))}
          </div>

          {/*
          The same action in the bar. A reader selecting with shift+arrows
          never reaches the floating button without hunting for it; this one
          is two Tabs from anywhere.
        */}
          {selection ? (
            <button
              type="button"
              onClick={speakSelection}
              className="border-outline bg-accent text-accent-foreground focus-visible:ring-ring rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              {t("readAloudSelection")}
            </button>
          ) : null}

          {/*
          The spoken position, said once rather than on every block: a live
          region that announced "4 / 210" each time a paragraph ended would
          talk over the reading it is describing.
        */}
          <span aria-live="polite" className="text-muted-foreground text-xs">
            {engine === "none"
              ? t("readAloudUnavailable")
              : status === "error"
                ? t("readAloudError")
                : position.total > 0
                  ? t("readAloudPosition", {
                      current: position.index + 1,
                      total: position.total,
                    })
                  : null}
          </span>
        </div>

        {/*
        No <track>: the caption for this audio is the page it was generated
        from, which the reader is looking at.
      */}
        <audio
          ref={audioRef}
          onEnded={() => step(1)}
          onError={() => setStatus("error")}
          className="hidden"
        />
      </div>
    </>
  );
}
