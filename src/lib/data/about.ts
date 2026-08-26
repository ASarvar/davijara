import "server-only";

import {
  establishment,
  establishmentOrder,
  officialNaming,
} from "@/content/about";

/*
  Data access for /markaz — the same async-even-though-static contract every
  module in this folder keeps; see the note in privileges.ts.
*/

export async function getAbout() {
  return { establishmentOrder, establishment, officialNaming };
}
