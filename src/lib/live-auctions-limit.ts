/**
 * How many live lots the homepage strip shows — two rows of three — and the
 * point past which "Barcha joriy savdolar" and its menu entry appear.
 *
 * Its own module, with no imports, because both sides read it: the strip is a
 * Server Component and the menu is client-side, and the hook module the menu
 * uses imports React state hooks a Server Component may not pull in. One
 * number, so the link can never appear while every live lot is already on
 * screen, or be missing while some are not.
 */
export const LIVE_STRIP_LIMIT = 6;
