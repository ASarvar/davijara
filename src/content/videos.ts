/*
  "Video sharhlar" on the homepage — the Centre's own YouTube Shorts
  (operator, 10.11.2026, from the review document's point 5).

  THE CHANNEL: https://www.youtube.com/@davijara_uz, supplied by the
  operator; the id below was read off that page's canonical link.

  WHY A LIST OF IDS, NOT "THE LATEST": YouTube's public RSS feeds, the
  key-free way to ask for a channel's newest uploads, answered 404 for every
  channel on 10.11.2026 — YouTube's own included — so a section built on
  them would have shipped empty. The automatic route that does work is the
  YouTube Data API, which needs a key the operator would have to create. Until
  then, this is the list: the eleven Shorts the channel's /shorts page showed
  on 10.11.2026, newest first. To add one, put its id (the part after
  /shorts/) at the top.

  Only ids. Titles and covers are read from YouTube itself
  (lib/data/videos.ts), so nothing here can drift from what the channel says.
*/
export const youtubeChannel = {
  url: "https://www.youtube.com/@davijara_uz",
  id: "UCaiMBW6Q9Lsb9afY4HgIApg",
} as const;

export const featuredShorts: readonly string[] = [
  "9jz1xYyxSGU",
  "VvMGiH-AbIE",
  "MfNi83JIdqA",
  "etCPRivsLsY",
  "sbSXShQeG1E",
  "kRF70YwNNKU",
  "JNeNZQmD3os",
  "lCo3Ii1eTZE",
  "2s_A50Sy2TE",
  "LmKnjAMRj3A",
  "kaOtUCju6e8",
];
