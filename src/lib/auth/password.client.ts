/*
  The password rules that BOTH sides need.

  `password.ts` is `server-only` — it holds the scrypt parameters and the
  hashing itself, none of which may be shipped to a browser. But the minimum
  length is also a `minLength` attribute on an <input> and a sentence in a
  hint, so it has to exist on the client too.

  Splitting the constant out is the whole point: the client imports this file,
  the server module imports it as well and re-exports it, so the number has
  one definition. Typing `12` into a form and `PASSWORD_MIN_LENGTH` into the
  validator is how a browser starts accepting passwords the server rejects.

  NOTHING SECRET GOES IN HERE. No scrypt cost, no pepper, no token — anything
  in this file is readable in the client bundle by anyone who opens devtools.
*/

/*
  LENGTH, NOT CHARACTER CLASSES — NIST SP 800-63B. Composition rules ("one
  uppercase, one digit, one symbol") reliably produce `Parol2024!`: memorable
  to no one and near the top of every cracking dictionary. Length is both
  stronger and easier to explain to a non-technical editor in Uzbek.
*/
export const PASSWORD_MIN_LENGTH = 12;

export const PASSWORD_MAX_LENGTH = 200;
