/*
  Type declaration for React's <ViewTransition>.

  The component exists at runtime — Next.js aliases `react` to its vendored
  build, and `node_modules/next/dist/compiled/react` does export
  `ViewTransition`. But `@types/react` (19.2.17 at time of writing) has not
  declared it yet, because the API is still experimental.

  This augmentation is the seam between those two facts. DELETE THIS FILE once
  @types/react ships the declaration; keeping a hand-written type after the
  real one lands would silently shadow it.

  Enabled by `experimental.viewTransition` in next.config.ts. Removing that
  flag disables the feature and makes this file dead.
*/
import "react";

declare module "react" {
  interface ViewTransitionProps {
    children?: React.ReactNode;
    /** Transition applied when no more specific trigger matches. */
    default?: string;
    /** Applied when the element is entering the tree. */
    enter?: string;
    /** Applied when the element is leaving the tree. */
    exit?: string;
    /** Applied when the element persists across the navigation. */
    update?: string;
    /** Pairs an element across routes so the browser morphs between them. */
    share?: string;
    /** Stable identifier used to match elements across routes. */
    name?: string;
  }

  export const ViewTransition: React.FC<ViewTransitionProps>;
}
