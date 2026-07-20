import { ImageResponse } from "next/og";
import { site } from "@/content/site";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Social share card, generated at build time in the brand navy/gold.
 * The legacy site had no Open Graph image (or any OG tags), so links shared
 * into Telegram — the dominant channel in Uzbekistan — rendered as bare URLs.
 */
export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #07102b 0%, #0d1e45 100%)",
          padding: 80,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 24,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#c8a96e",
            fontWeight: 600,
          }}
        >
          O&apos;zbekiston Respublikasi
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.1,
            }}
          >
            {site.name}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 34,
              color: "rgba(255,255,255,0.7)",
              marginTop: 20,
              maxWidth: 900,
            }}
          >
            {site.tagline}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            borderTop: "2px solid rgba(200,169,110,0.3)",
            paddingTop: 28,
            fontSize: 26,
            color: "#c8a96e",
          }}
        >
          davijara.uz
        </div>
      </div>
    ),
    size,
  );
}
