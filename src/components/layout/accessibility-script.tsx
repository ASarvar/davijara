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
 * the dark theme at normal contrast — never a blank or half-styled page.
 */
export function AccessibilityScript() {
  /*
    Dark is the default, so only `light` is ever written as an attribute.
    Storing and checking the exact string rather than a boolean means a
    corrupted or half-written value falls back to dark instead of to
    something undefined.
  */
  const script = `
try {
  var c = localStorage.getItem('davijara-contrast');
  var s = localStorage.getItem('davijara-text-size');
  var t = localStorage.getItem('davijara-theme');
  if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
  if (c === 'high') document.documentElement.setAttribute('data-contrast', 'high');
  if (s === 'large' || s === 'xlarge') document.documentElement.setAttribute('data-text-size', s);
} catch (e) {}
`.trim();

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
