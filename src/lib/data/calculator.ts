import "server-only";

import { objectRates, regionCoefficients } from "@/content/calculator";
import { localizeContent } from "@/lib/i18n/content";

/*
  The calculator's two option lists, labelled in the reader's language.
  RentCalculator is a client component and cannot read the translators'
  dictionary itself (it stays on the server), so the page reads the lists
  here and hands them down. The rates and coefficients are untouched:
  `value` is never translated.
*/
export async function getCalculatorOptions(locale?: string) {
  return localizeContent({ objectRates, regionCoefficients }, locale);
}
