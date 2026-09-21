import { formatFixed, formatNumber } from "@/lib/format";
import type { LeasedObject } from "@/types/content";

export interface LeasedObjectsLabels {
  colObject: string;
  colAddress: string;
  colContracts: string;
  colArea: string;
  noCadastre: string;
}

/**
 * Leased objects on /ijara-shartnomalari, as ONE table: name and cadastre
 * number, address, number of contracts, leased area.
 *
 * A table and not a stack of cards, at the operator's request — and it is the
 * right shape for this page: it is a register, and the reader scans down the
 * count and area columns comparing objects, which only a shared column grid
 * lets them do.
 *
 * The individual contracts are not listed under a row: the operator asked
 * for the object-level figures only (21.09.2026), so a row is one object and
 * nothing opens.
 *
 * Wider than a phone, so the table scrolls sideways inside its frame rather
 * than squeezing four columns into 375px or pushing the page wider.
 */
export function LeasedObjectsTable({
  objects,
  regionName,
  labels,
}: {
  objects: LeasedObject[];
  regionName: (slug: string) => string;
  labels: LeasedObjectsLabels;
}) {
  return (
    <div
      data-reveal="fade"
      className="border-hairline bg-card overflow-x-auto rounded-md border [box-shadow:var(--shadow-1)]"
    >
      <table className="w-full min-w-[44rem] text-sm">
        <thead>
          <tr className="border-hairline text-muted-foreground border-b text-left text-xs">
            <th scope="col" className="w-[38%] px-4 py-3 font-medium">
              {labels.colObject}
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              {labels.colAddress}
            </th>
            <th scope="col" className="w-28 px-4 py-3 text-right font-medium">
              {labels.colContracts}
            </th>
            <th scope="col" className="w-32 px-4 py-3 text-right font-medium">
              {labels.colArea}
            </th>
          </tr>
        </thead>

        <tbody>
          {objects.map((object) => (
            <tr
              key={`${object.region}|${object.cad}|${object.district}`}
              className="border-hairline hover:bg-accent/5 border-b align-top transition-colors last:border-b-0"
            >
              <NameCell object={object} labels={labels} />
              <td className="text-muted-foreground px-4 py-3">
                {object.address
                  ? `${regionName(object.region)}, ${object.address}`
                  : [regionName(object.region), object.district]
                      .filter(Boolean)
                      .join(", ")}
              </td>
              <td className="text-ornament font-heading px-4 py-3 text-right text-base font-bold tabular-nums">
                {formatNumber(object.contracts.length)}
              </td>
              <td className="text-foreground px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums">
                {area(object.areaM2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The cadastre's name over its number — or, until the cadastre has answered
 * for this number, the number alone as the title.
 */
function NameCell({
  object,
  labels,
}: {
  object: LeasedObject;
  labels: LeasedObjectsLabels;
}) {
  return (
    <th scope="row" className="px-4 py-3 text-left font-normal">
      {object.name ? (
        <span className="text-foreground block font-semibold text-pretty">
          {object.name}
        </span>
      ) : null}
      {object.cad ? (
        <span
          className={
            object.name
              ? "text-muted-foreground mt-0.5 block font-mono text-xs tabular-nums"
              : "text-foreground block font-mono font-semibold tabular-nums"
          }
        >
          {object.cad}
        </span>
      ) : (
        <span className="text-muted-foreground block italic">
          {labels.noCadastre}
        </span>
      )}
    </th>
  );
}

/** The register gives areas to a tenth of a metre; so does the page. */
function area(m2: number): string {
  return `${formatFixed(m2, 1)} m²`;
}
