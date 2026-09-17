# shadcn output

Everything here is shadcn CLI output: do not hand-edit it, and do not put
project primitives here — those belong in `src/components/common/`.

**One documented exception, and it is shaped so a re-add cannot break it
silently.** `dialog.tsx` and `sheet.tsx` shipped a hardcoded English "Close" as
the × button's accessible name — spoken text, on a trilingual portal. They now
take a `closeLabel` prop that still DEFAULTS to `"Close"`, so the files remain
valid shadcn with no `next-intl` import and no provider requirement; the two
callers (`accessibility-dialog`, `mobile-nav`) pass `t("close")`. It is a prop
and not a hook because the admin panel renders outside
`NextIntlClientProvider`, where a hook in `ui/` would crash the first dialog
anyone put there. If `shadcn add dialog` ever overwrites these, the prop
disappears and TypeScript fails at both call sites — which is the point.
