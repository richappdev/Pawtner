import { ImageResponse } from "next/og";

import messages from "../../messages/zh-TW.json";

export const alt = messages.Metadata.siteTitle;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
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
          background: "linear-gradient(145deg, #fbfaf5 0%, #ddeee8 55%, #a9cbbf 100%)",
          color: "#1d2421",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: "-0.02em", color: "#0b6757" }}>
            Pawtner
          </div>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.15, maxWidth: 900 }}>
            {messages.Metadata.siteTitle.replace("Pawtner｜", "")}
          </div>
        </div>
        <div style={{ fontSize: 28, color: "#5f6964", maxWidth: 820, lineHeight: 1.4 }}>
          {messages.Metadata.siteDescription}
        </div>
      </div>
    ),
    { ...size },
  );
}
