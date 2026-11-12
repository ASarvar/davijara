/*
  "Video sharhlar" on the homepage — the Centre's own YouTube Shorts
  (operator, 10.11.2026, from the review document's point 5).

  THE CHANNEL: https://www.youtube.com/@davijara_uz, supplied by the
  operator; the id below was read off that page's canonical link.

  NOT THE SOURCE ANY MORE. The row comes from the channel's RSS feed, and
  when that fails, from the last row the site rendered successfully, kept in
  the database (lib/data/videos.ts, since 12.11.2026). This list is read in
  one case only: a server that has never once reached YouTube — a fresh
  database — where there is no last good row yet. It holds the Shorts the
  channel's /shorts page showed on 12.11.2026, newest first; a new upload
  does not need adding here.

  Only ids. Titles and covers are read from YouTube itself
  (lib/data/videos.ts), so nothing here can drift from what the channel says.
*/
export const youtubeChannel = {
  url: "https://www.youtube.com/@davijara_uz",
  id: "UCaiMBW6Q9Lsb9afY4HgIApg",
} as const;

export const featuredShorts: readonly string[] = [
  "V0udnNCQB1A",
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
