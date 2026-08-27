import "server-only";

import {
  dutiesHeading,
  dutiesIntro,
  dutiesOrder,
  duties,
  functionGroups,
  functionsHeading,
  functionsIntro,
} from "@/content/duties";
import { getDutiesDocument } from "./documents";

/*
  Data access for /markaz/vazifalar — now backed by the admin panel.

  Same arrangement as about.ts, including the fallback: the TypeScript module
  below is what /markaz/vazifalar renders if the database row is missing or
  fails validation. See the fuller note there.
*/
export async function getDuties() {
  const stored = getDutiesDocument();
  if (stored) return stored;

  return {
    order: dutiesOrder,
    duties: { heading: dutiesHeading, intro: dutiesIntro, items: duties },
    functions: {
      heading: functionsHeading,
      intro: functionsIntro,
      groups: functionGroups,
    },
  };
}
