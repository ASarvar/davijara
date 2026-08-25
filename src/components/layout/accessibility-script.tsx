/**
 * Applies saved display preferences before first paint.
 *
 * This has to be a blocking inline script in <head>: if the attributes were
 * set from a useEffect instead, a user who has chosen high-contrast mode — or
 * the light theme — would see a flash of the navy palette on every
 * navigation, which defeats the purpose for exactly the people the mode
 * exists for and looks broken for everyone else.
 *
 * Kept deliberately tiny and wrapped in try/catch, since localStorage throws
 * in some privacy modes. A throw here leaves the defaults in place, which are
 * the LIGHT theme at normal contrast — never a blank or half-styled page.
 */
export function AccessibilityScript() {
  /*
    LIGHT IS THE DEFAULT, and the mechanism is worth stating because it is the
    inverse of what the code looked like for most of its life.

    The stylesheet has exactly one theme selector — `:root[data-theme="light"]`
    — and `:root` alone carries the navy palette. So "which theme is default"
    is decided entirely by whether that attribute is on the server-rendered
    <html>, and NOT by any CSS. The layout now prints `data-theme="light"`
    always, and this script's only job is to take it OFF for a reader who
    chose dark.

    That keeps the whole flip to two files. Inverting globals.css instead —
    moving the navy palette into a `[data-theme="dark"]` block and hoisting
    light to `:root` — would have rewritten ~400 lines of tokens, the
    `@custom-variant dark` rule, and the two logo `<picture>` selectors, for
    the same rendered result.

    Storing and checking the exact string rather than a boolean means a
    corrupted or half-written value falls back to the default instead of to
    something undefined.
  */
  const script = `
try {
  var c = localStorage.getItem('davijara-contrast');
  var s = localStorage.getItem('davijara-text-size');
  var t = localStorage.getItem('davijara-theme');
  /*
    A marker that JavaScript ran at all. /statistika ships every chart's
    numbers as a visible <table> so a no-JS visitor gets the figures — but the
    charts only draw once scrolled to, so without this every table below the
    fold was on screen, at full height, until its chart caught up. The
    stylesheet hides them the moment this attribute exists and shows them
    again if a chart reports that it could not draw.
  */
  document.documentElement.setAttribute('data-js', '');
  // The server already printed data-theme="light"; only 'dark' changes it.
  if (t === 'dark') document.documentElement.removeAttribute('data-theme');
  if (c === 'high') document.documentElement.setAttribute('data-contrast', 'high');
  if (s === 'large' || s === 'xlarge') document.documentElement.setAttribute('data-text-size', s);
} catch (e) {}
`.trim();

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
