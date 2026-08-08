/*
  Arms the reveal start states, before first paint.

  A blocking inline script in <head>, for the same reason AccessibilityScript
  is one: the hidden state has to be in place for the very first frame. Adding
  the class from an effect would let every reveal paint at full opacity and
  then blink out as React hydrated.

  It is deliberately the ONLY thing that can hide content, and it hands itself
  a deadman switch. On a public-service portal the failure that matters is not
  "the animation did not play" — it is "the page is blank". So:

    · reduced motion            → returns before arming; nothing is hidden
    · no JavaScript             → never runs; nothing is hidden
    · GSAP never signals ready  → the timer below disarms; nothing is hidden

  The provider sets `window.__motionReady` once ScrollTrigger is actually
  driving the page. If that has not happened within the timeout — a failed
  chunk, a thrown error, a very slow connection — the class comes off and the
  content is simply there, unanimated.
*/
const ARM = `(function () {
  try {
    var d = document.documentElement;
    if (!window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    d.classList.add('motion-armed');
    window.setTimeout(function () {
      if (!window.__motionReady) d.classList.remove('motion-armed');
    }, 2500);
  } catch (e) {
    /* Any failure at all leaves the page unarmed, i.e. fully visible. */
  }
})();`;

export function MotionArmScript() {
  return (
    <script
      // Inline and blocking on purpose — see above.
      dangerouslySetInnerHTML={{ __html: ARM }}
    />
  );
}
