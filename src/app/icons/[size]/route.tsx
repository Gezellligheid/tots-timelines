import { ImageResponse } from "next/og";

export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const s = Math.min(Math.max(parseInt((await params).size) || 192, 64), 1024);
  return new ImageResponse(
    (
      <div style={{ width: s, height: s, display: "flex", alignItems: "center", justifyContent: "center", background: "#cfd3f8" }}>
        <div
          style={{
            width: s * 0.62,
            height: s * 0.62,
            borderRadius: 9999,
            background: "#fbe9a6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#17171a",
            fontSize: s * 0.28,
            fontWeight: 800,
          }}
        >
          T&amp;T
        </div>
      </div>
    ),
    { width: s, height: s },
  );
}
