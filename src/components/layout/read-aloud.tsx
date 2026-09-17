"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, Loader2, Pause, Play, Volume2 } from "lucide-react";

import { usePathname } from "@/i18n/navigation";
import { withBasePath } from "@/lib/base-path";
import { cn } from "@/lib/utils";
import { MAX_CHUNK_CHARS, splitIntoChunks } from "@/lib/tts/chunks";
import { isTtsLocale, type TtsVoice } from "@/lib/tts/voices";

/*
  "Matnni o'qib berish" — the text a reader selects, read aloud.

  NOT A REPLACEMENT FOR A SCREEN READER, and the distinction decides the
  design. Someone running NVDA or VoiceOver already has the page, and gets it
  better than this could. This is for the reader who does not run one — low
  vision, tired eyes, poor literacy, a long statute — so it is one small
  control beside the words they chose, in the manner of my.gov.uz, and never
  starts by itself.

  ON BY DEFAULT, and that is only acceptable because it costs nothing until
  used: no request is made, and nothing is drawn, until someone selects text
  inside <main>. The switch and the voice live in "Maxsus imkoniyatlar"
  (accessibility-controls.tsx), which writes them to <html>.

  There was a whole-page player with a bar at the foot of the screen before
  this. The operator removed it: the selection is the reading.

  THE AUDIO IS NOT MADE HERE. `/api/tts` holds the key, checks that the words
  are actually on the page it was told, and caches the result. See
  lib/tts/azure.ts.
*/

type Status = "idle" | "loading" | "playing" | "paused" | "error";

/*
  WHO IS DOING THE SPEAKING.

  `server` is the real answer: Azure, through /api/tts, the only one that can
  say an Uzbek sentence properly. `browser` is the fallback for a deployment
  with no speech service — it can only offer what the reader's device has, and
  no desktop browser ships an Uzbek voice. `none` shows no control at all:
  with the feature on for everyone, a button beside every selection that
  could only say "unavailable" would be noise on every copy of an address.
*/
type Engine = "server" | "browser" | "none";

type Selected = {
  /* `toString()`, only to tell one selection from another. */
  text: string;
  range: Range;
  /* Where the selection ENDS — the last character the pointer reached. */
  x: number;
  lineTop: number;
  lineBottom: number;
};

/*
  A chunk the server refused as not on the page. Skipped rather than fatal: a
  selection is many chunks, and one that cannot be checked — text a script
  changed after the page was served — should not silence all the others.
*/
class RefusedChunk extends Error {}

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

/** Read at the moment of speaking, so a change in the dialog applies at once. */
function currentVoice(): TtsVoice {
  return document.documentElement.getAttribute("data-read-aloud-voice") ===
    "male"
    ? "male"
    : "female";
}

/*
  The selection, split where the page splits it.

  The text has a line break between blocks. One whole paragraph or heading is
  one line and so exactly the chunk the deploy-time warm-up already voiced
  (scripts/warm-tts.mjs), served from the cache; anything longer is packed.
*/
function selectionChunks(text: string): string[] {
  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  /*
    SHORT LINES ARE PACKED TOGETHER, joined by a line break the server turns
    into a pause. A lot card is seven lines — title, place, area, label,
    price, label, time — and sent one by one it cost seven syntheses, which on
    the free tier is a third of a minute's allowance for one card.
  */
  const chunks: string[] = [];
  let current = "";
  for (const line of lines) {
    if (line.length > MAX_CHUNK_CHARS) {
      if (current) chunks.push(current);
      current = "";
      chunks.push(...splitIntoChunks(line));
    } else if (current && current.length + 1 + line.length > MAX_CHUNK_CHARS) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/*
  The words of a selection, without the ones that are not for reading.

  NOT `Selection.toString()`, which includes everything the range covers —
  the ticking countdown on a lot card among it, which the server can never
  find on its copy of the page and so refused. The same subtrees the server
  strips (lib/tts/extract.ts) are removed from a copy of the range here.

  `innerText` needs a rendered element to put line breaks between blocks, so
  the copy is attached off-screen for the moment it takes to read.
*/
function readableSelection(range: Range): string {
  const box = document.createElement("div");
  box.append(range.cloneContents());
  for (const hidden of box.querySelectorAll(
    '[aria-hidden="true"], [data-tts-skip]',
  )) {
    hidden.remove();
  }
  box.style.cssText = "position:fixed;left:-99999px;top:0;width:60rem";
  document.body.append(box);
  const text = box.innerText;
  box.remove();
  return text.trim();
}

/* The button's own box, for keeping it on screen. */
const BUTTON_WIDTH = 72;
const BUTTON_HEIGHT = 40;
const BUTTON_GAP = 6;

/*
  The end of a selection, in viewport coordinates.

  "END" MEANS WHERE THE POINTER STOPPED — the selection's focus — not the
  later point in the text: a selection dragged upwards ends at its first
  character. The button appears
  there, beside the hand that just let go, the way Google Translate's does —
  not above the middle of a paragraph where the eye has to go looking for it.

  THE CARET AT THAT POINT, not the range's rectangles. A range that wholly
  contains an element reports that element's box among its rectangles, so on
  a selected card the "last rectangle" was the card itself and the button
  landed at its bottom corner, away from the last word. A collapsed range in
  a text node measures exactly one line. The rectangles remain the fallback
  for an end that sits between elements, where a caret has no box.
*/
function selectionEnd(
  sel: Selection,
  range: Range,
): { x: number; lineTop: number; lineBottom: number } {
  if (sel.focusNode?.nodeType === Node.TEXT_NODE) {
    const caret = document.createRange();
    caret.setStart(sel.focusNode, sel.focusOffset);
    const rect = caret.getClientRects()[0];
    if (rect && rect.height > 0) {
      return { x: rect.left, lineTop: rect.top, lineBottom: rect.bottom };
    }
  }

  const rects = [...range.getClientRects()].filter(
    (rect) => rect.width > 0 && rect.height > 0,
  );
  const last = rects.at(-1) ?? range.getBoundingClientRect();
  return { x: last.right, lineTop: last.top, lineBottom: last.bottom };
}

export function ReadAloud() {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();

  const [enabled, setEnabled] = useState(true);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [selection, setSelection] = useState<Selected | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<string[]>([]);
  const indexRef = useRef(0);
  /* The text being read, so a new selection can be told from a re-measure. */
  const spokenRef = useRef<string | null>(null);
  const urlsRef = useRef(new Map<number, string>());
  const nextRef = useRef<{ index: number; promise: Promise<string> } | null>(
    null,
  );
  /*
    `play` calls itself when a chunk ends, and that callback outlives the
    render that created it. The ref keeps the call pointed at the current
    closure.
  */
  const playRef = useRef<(index: number) => void>(() => {});

  /*
    The switch lives on <html>: set before paint by AccessibilityScript and
    toggled by AccessibilityControls. Only an explicit "off" turns it off.
  */
  useEffect(() => {
    const read = () =>
      setEnabled(
        document.documentElement.getAttribute("data-read-aloud") !== "off",
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

    Coalesced into a frame, because `selectionchange` fires continuously while
    a selection is dragged, and re-measured on scroll and resize so the button
    stays on the words it belongs to.
  */
  useEffect(() => {
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

        if (
          text.length < 2 ||
          !node ||
          !main.contains(node) ||
          node.closest("[data-tts-skip]")
        ) {
          setSelection(null);
          return;
        }

        setSelection({
          text,
          range: range.cloneRange(),
          ...selectionEnd(sel, range),
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
    Asked once, on the first selection — not on page load. The feature is on
    for every visitor, and most of them will never select anything.
  */
  const wanted = enabled && selection !== null;
  useEffect(() => {
    if (!wanted || engine !== null) return;
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
  }, [wanted, engine, locale]);

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
    chunksRef.current = [];
    indexRef.current = 0;
    spokenRef.current = null;
    releaseAudio();
    setStatus("idle");
  }, [releaseAudio]);

  // A new page is a new text.
  useEffect(() => stop, [pathname, stop]);

  /*
    The reading belongs to the words it was started on. When the selection
    goes away, or becomes different words, the reading stops — otherwise audio
    would carry on with no control left on the screen to stop it.
  */
  const selectedText = enabled ? (selection?.text ?? null) : null;
  useEffect(() => {
    if (spokenRef.current !== null && selectedText !== spokenRef.current) {
      stop();
    }
  }, [selectedText, stop]);

  /*
    SPEECH OUTLIVES THE PAGE. `speechSynthesis` belongs to the browser, not to
    the document: an utterance queued here keeps speaking through a full
    navigation, so the queue is cleared on the way out and on the way in.
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

      const res = await fetch(withBasePath("/api/tts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: window.location.pathname,
          text: chunksRef.current[index],
          locale: isTtsLocale(locale) ? locale : "uz",
          voice: currentVoice(),
        }),
      });
      if (res.status === 400) throw new RefusedChunk();
      if (!res.ok) throw new Error(`tts ${res.status}`);

      const url = URL.createObjectURL(await res.blob());
      urlsRef.current.set(index, url);
      for (const [key, value] of urlsRef.current) {
        if (key < index - 1) {
          URL.revokeObjectURL(value);
          urlsRef.current.delete(key);
        }
      }
      return url;
    },
    [locale],
  );

  const play = useCallback(
    async (index: number) => {
      const chunks = chunksRef.current;
      if (index < 0 || index >= chunks.length) {
        // Finished. The selection is still there, so the button returns to ▶.
        stop();
        return;
      }
      indexRef.current = index;

      /*
        The device's own voice: no request, no cache — the utterance IS the
        audio. Male and female map onto the first two voices the platform
        lists, because the Web Speech API does not report a voice's gender.
      */
      if (engine === "browser") {
        try {
          const utterance = new SpeechSynthesisUtterance(chunks[index]);
          const voices = browserVoices(locale);
          const picked =
            voices[currentVoice() === "male" && voices.length > 1 ? 1 : 0];
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
        if (!audio || indexRef.current !== index || !spokenRef.current) return;
        audio.src = url;
        await audio.play();
        setStatus("playing");

        // The next chunk is fetched while this one speaks.
        if (index + 1 < chunks.length) {
          nextRef.current = {
            index: index + 1,
            promise: fetchChunk(index + 1),
          };
          void nextRef.current.promise.catch(() => {
            nextRef.current = null;
          });
        }
      } catch (error) {
        if (error instanceof RefusedChunk && indexRef.current === index) {
          nextRef.current = null;
          void playRef.current(index + 1);
          return;
        }
        setStatus("error");
      }
    },
    [engine, fetchChunk, locale, stop],
  );

  useEffect(() => {
    playRef.current = play;
  }, [play]);

  /*
    One button, four jobs: start, pause, resume, and retry after a fault.
    While the audio is being prepared it shows a spinner and ignores presses,
    which is the reaction a reader was missing when it said nothing at all.
  */
  const press = useCallback(() => {
    if (!selection) return;

    if (status === "playing") {
      if (engine === "browser") window.speechSynthesis.pause();
      else audioRef.current?.pause();
      setStatus("paused");
      return;
    }
    if (status === "paused") {
      if (engine === "browser") {
        window.speechSynthesis.resume();
        setStatus("playing");
      } else {
        void audioRef.current?.play().then(() => setStatus("playing"));
      }
      return;
    }
    if (status === "loading") return;

    const chunks = selectionChunks(readableSelection(selection.range));
    if (chunks.length === 0) return;

    releaseAudio();
    chunksRef.current = chunks;
    spokenRef.current = selection.text;
    void play(0);
  }, [engine, play, releaseAudio, selection, status]);

  useEffect(() => releaseAudio, [releaseAudio]);

  const visible =
    enabled && selection !== null && engine !== null && engine !== "none";

  const label =
    status === "loading"
      ? t("readAloudLoading")
      : status === "playing"
        ? t("readAloudPause")
        : status === "paused"
          ? t("readAloudResume")
          : status === "error"
            ? t("readAloudError")
            : t("readAloudSelection");

  return (
    <>
      {/*
        `onMouseDown` IS PREVENTED, and without that line this button cannot
        be clicked at all: pressing anywhere outside a selection collapses it,
        `selectionchange` fires, and the button unmounts before the click
        lands on it.

        Icon-only, like my.gov.uz: the speaker says what it is, the disc says
        what pressing does. The name a screen reader hears is the label, and
        the same text is the tooltip.
      */}
      {visible ? (
        <button
          type="button"
          data-tts-skip
          onMouseDown={(event) => event.preventDefault()}
          onClick={press}
          aria-busy={status === "loading"}
          title={label}
          style={{
            /*
              Just below the last line, starting where the words stop; above
              that line instead when there is no room below it.
            */
            top:
              selection.lineBottom + BUTTON_GAP + BUTTON_HEIGHT <=
              window.innerHeight
                ? selection.lineBottom + BUTTON_GAP
                : selection.lineTop - BUTTON_GAP - BUTTON_HEIGHT,
            left: Math.min(
              Math.max(selection.x + BUTTON_GAP, 8),
              window.innerWidth - BUTTON_WIDTH - 8,
            ),
          }}
          className="group border-outline bg-card text-accent-foreground focus-visible:ring-ring fixed z-[950] flex items-center gap-1.5 rounded-full border py-1 pr-1 pl-2.5 [box-shadow:var(--shadow-2)] focus-visible:ring-2 focus-visible:outline-none"
        >
          <Volume2 aria-hidden="true" className="size-4" />
          <span
            aria-hidden="true"
            className={cn(
              "grid size-7 place-items-center rounded-full transition-colors",
              status === "error"
                ? "bg-secondary text-foreground"
                : "bg-primary text-primary-foreground group-hover:opacity-90",
            )}
          >
            {status === "loading" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : status === "playing" ? (
              <Pause className="size-3.5 fill-current" />
            ) : status === "error" ? (
              <AlertCircle className="size-3.5" />
            ) : (
              <Play className="size-3.5 translate-x-px fill-current" />
            )}
          </span>
          <span className="sr-only">{label}</span>
        </button>
      ) : null}

      {/* A fault is said once, where a screen reader will hear it. */}
      <span aria-live="polite" className="sr-only">
        {status === "error" ? t("readAloudError") : null}
      </span>

      {/*
        No <track>: the caption for this audio is the text the reader has
        selected and is looking at.
      */}
      <audio
        ref={audioRef}
        onEnded={() => void play(indexRef.current + 1)}
        onError={() => {
          if (spokenRef.current) setStatus("error");
        }}
        className="hidden"
      />
    </>
  );
}
