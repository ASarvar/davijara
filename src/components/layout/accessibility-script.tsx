/**
 * Applies saved accessibility preferences before first paint.
 *
 * This has to be a blocking inline script in <head>: if the attributes were
 * set from a useEffect instead, a user who has chosen high-contrast mode would
 * see a flash of the normal navy palette on every navigation — which defeats
 * the purpose for exactly the people the mode exists for.
 *
 * Kept deliberately tiny and wrapped in try/catch, since localStorage throws
 * in some privacy modes.
 */
export function AccessibilityScript() {
  const script = `
try {
  var c = localStorage.getItem('davijara-contrast');
  var s = localStorage.getItem('davijara-text-size');
  if (c === 'high') document.documentElement.setAttribute('data-contrast', 'high');
  if (s === 'large' || s === 'xlarge') document.documentElement.setAttribute('data-text-size', s);
} catch (e) {}
`.trim();

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
