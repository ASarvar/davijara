/*
  The frame every chart sits in: a card, a legend, and the numbers as a table.

  THE TABLE IS NOT A FALLBACK BOLTED ON AFTERWARDS. It is the primary
  representation and it is always in the HTML; the canvas is what gets layered
  over it. `data-chart-table` lets the stylesheet collapse it once the canvas
  has drawn, so a sighted reader with JavaScript sees the chart and everyone
  else — a screen reader, a printer, a crawler, a visitor with JavaScript off,
  someone in high contrast at 150% text — still gets every figure.

  This is a Server Component: no directive, no hooks. Only the canvas inside
  it is client code.
*/
export function ChartFigure({
  title,
  description,
  legend,
  caption,
  columns,
  rows,
  children,
}: {
  title?: string;
  description?: string;
  legend?: {
    label: string;
    color: "accent" | "muted" | "faint";
    line?: boolean;
  }[];
  caption?: string;
  /** Column headers for the data table. First is the row label. */
  columns: string[];
  rows: (string | number)[][];
  /** The canvas. */
  children: React.ReactNode;
}) {
  const swatch = {
    accent: "bg-accent-foreground",
    muted: "bg-muted-foreground/55",
    faint: "bg-muted-foreground/25",
  } as const;

  return (
    <figure className="m-0">
      {title ? <h3 className="mb-1 text-sm font-semibold">{title}</h3> : null}
      {description ? (
        <p className="text-muted-foreground mb-5 max-w-lg text-sm text-pretty">
          {description}
        </p>
      ) : null}

      {children}

      {legend && legend.length > 0 ? (
        <ul className="text-muted-foreground mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          {legend.map((item) => (
            <li key={item.label} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={
                  item.line
                    ? "border-foreground inline-block w-5 border-t-2 border-dashed"
                    : `inline-block size-2.5 rounded-full ${swatch[item.color]}`
                }
              />
              {item.label}
            </li>
          ))}
        </ul>
      ) : null}

      {caption ? (
        <figcaption className="text-muted-foreground mt-4 text-xs text-pretty">
          {caption}
        </figcaption>
      ) : null}

      <table data-chart-table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-hairline border-b">
            {columns.map((c, i) => (
              <th
                key={c}
                scope="col"
                className={`text-muted-foreground pb-2 text-xs font-normal ${
                  i === 0 ? "text-left" : "text-right"
                }`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row[0])} className="border-hairline border-b">
              <th scope="row" className="py-2 text-left font-normal">
                {row[0]}
              </th>
              {row.slice(1).map((cell, i) => (
                <td
                  key={i}
                  className="py-2 text-right font-semibold tabular-nums"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
