import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.name} — Handmade Artisanal Pottery`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
          padding: "72px",
          background: "linear-gradient(135deg, #efe6d6 0%, #e7d6bf 100%)",
          color: "#3a2a1e",
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
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, lineHeight: 1.02, fontWeight: 600 }}>
            Georgia Perkins
          </div>
          <div style={{ fontSize: 96, lineHeight: 1.02, color: "#a35a34" }}>
            Pottery
          </div>
        </div>
        <div style={{ fontSize: 34, maxWidth: 820, color: "#5c4a3a" }}>
          Artisanal plates &amp; garden pieces, thrown by hand.
        </div>
      </div>
    ),
    size,
  );
}
