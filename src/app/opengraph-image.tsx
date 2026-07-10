import { ImageResponse } from "next/og";
import { G_PATH } from "@/lib/logo-path";
import { site } from "@/lib/site";

export const alt = `${site.name} — Handmade Artisanal Pottery`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The "g" mark as a data-URI so satori can render it as an <img>.
const gMark = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 441 612'><path fill='#16223a' d='${G_PATH}'/></svg>`,
)}`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background: "linear-gradient(135deg, #f1e8d8 0%, #e7d6bf 100%)",
          color: "#16223a",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            fontSize: 26,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: "#a35a34",
          }}
        >
          Handmade Ceramics
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gMark} width={132} height={183} alt="" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 92, lineHeight: 1.0, fontWeight: 600 }}>
              Georgia Perkins
            </div>
            <div
              style={{
                fontSize: 30,
                letterSpacing: 14,
                textTransform: "uppercase",
                color: "#5c4a3a",
                marginTop: 8,
              }}
            >
              Pottery
            </div>
          </div>
        </div>

        <div style={{ fontSize: 34, maxWidth: 900, color: "#5c4a3a" }}>
          Artisanal plates &amp; garden pieces, thrown by hand.
        </div>
      </div>
    ),
    size,
  );
}
