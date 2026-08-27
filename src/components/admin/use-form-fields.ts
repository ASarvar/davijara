"use client";

import { useState } from "react";

/*
  Keeps what an editor typed when a save is REJECTED.

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ REACT 19 RESETS AN UNCONTROLLED FORM AFTER ITS ACTION RETURNS.           │
  │                                                                          │
  │ `<form action={serverAction}>` clears every uncontrolled field once the  │
  │ action settles — which is right after a successful submit, and a disaster│
  │ after a failed one. Observed here: saving a page with a path that was    │
  │ already taken came back with the error message and an EMPTY form. The    │
  │ title, the path and the summary were gone; only the block editor         │
  │ survived, because its content lives in React state rather than in the    │
  │ DOM.                                                                     │
  │                                                                          │
  │ On a form where someone may have spent twenty minutes writing a page,    │
  │ losing everything to a validation error is worse than the error.         │
  │                                                                          │
  │ Controlled inputs are the fix: the value comes from state on every       │
  │ render, so the reset has nothing to reset TO and the text stays.         │
  └──────────────────────────────────────────────────────────────────────────┘

  Used by both editors. Anything that must survive a rejected save goes
  through `bind()`; a genuinely fixed value (a row id) can stay a plain
  hidden input, because there is nothing to lose.
*/
export function useFormFields(initial: Record<string, string>) {
  const [fields, setFields] = useState<Record<string, string>>(initial);

  /** Props for a controlled text input or textarea. */
  function bind(name: string) {
    return {
      name,
      id: name,
      value: fields[name] ?? "",
      onChange: (
        event: React.ChangeEvent<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
      ) => {
        const { value } = event.target;
        setFields((previous) => ({ ...previous, [name]: value }));
      },
    };
  }

  /** For a value set by something other than a keystroke (the image picker). */
  function set(name: string, value: string) {
    setFields((previous) => ({ ...previous, [name]: value }));
  }

  return { fields, bind, set };
}
