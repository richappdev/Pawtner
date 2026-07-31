import { ImageResponse } from "next/og";

export const alt = "Pawtner｜讓每次相遇，都更接近一個家";
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
            讓每次相遇，都更接近一個家。
          </div>
        </div>
        <div style={{ fontSize: 28, color: "#5f6964", maxWidth: 820, lineHeight: 1.4 }}>
          以透明的生命紀錄與負責任的媒合，陪你找到適合彼此的家人。
        </div>
      </div>
    ),
    { ...size },
  );
}
