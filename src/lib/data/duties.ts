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

/*
  Data access for /markaz/vazifalar — the same async-even-though-static
  contract every module in this folder keeps; see the note in privileges.ts.
*/

export async function getDuties() {
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
