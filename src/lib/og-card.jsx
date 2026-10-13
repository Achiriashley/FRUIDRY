import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// The picture shown when a Fruidry link is shared (WhatsApp, Facebook, ...).
// Built from local files only, so it renders without downloading anything.

export const OG_SIZE = { width: 1200, height: 630 };

const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

// A file from public/ as a data URL the image renderer can use (JPEG/PNG only).
export async function publicImage(publicPath) {
  const type = publicPath && MIME[path.extname(publicPath).toLowerCase()];
  if (!type) return null;
  try {
    const bytes = await fs.readFile(path.join(process.cwd(), "public", publicPath));
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

// Link previews are re-encoded as JPEG: WhatsApp skips preview images much over
// 300 KB, and a PNG with the pack photo is about twice that.
export const OG_CONTENT_TYPE = "image/jpeg";

export async function asJpeg(imageResponse) {
  const png = Buffer.from(await imageResponse.arrayBuffer());
  const jpeg = await sharp(png).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  const headers = new Headers(imageResponse.headers);
  headers.set("Content-Type", OG_CONTENT_TYPE);
  headers.delete("Content-Length");
  return new Response(jpeg, { status: imageResponse.status, headers });
}

// The default font lacks the narrow spaces used in "2 500 FCFA".
const plain = (text) => text?.replace(/[  ]/g, " ");

export async function OgCard({ title, subtitle, footer, photo }) {
  [title, subtitle, footer] = [plain(title), plain(subtitle), plain(footer)];
  const logo = await publicImage("/brand/logo-lockup.png");
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "linear-gradient(135deg, #fdf1c7 0%, #fbf7ee 55%, #e9f1e4 100%)",
        fontFamily: "sans-serif",
        color: "#072a19",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 64px",
          width: photo ? 760 : 1200,
        }}
      >
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" width={246} height={80} />
        )}
        <div
          style={{
            display: "flex",
            marginTop: 32,
            fontSize: photo ? 60 : 72,
            fontWeight: 800,
            lineHeight: 1.1,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              display: "flex",
              marginTop: 20,
              fontSize: 32,
              color: "#44403c",
            }}
          >
            {subtitle}
          </div>
        )}
        {footer && (
          <div style={{ display: "flex", marginTop: 36 }}>
            <div
              style={{
                display: "flex",
                padding: "10px 24px",
                borderRadius: 999,
                background: "#0f4a2a",
                color: "#fbf7ee",
                fontSize: 30,
                fontWeight: 700,
              }}
            >
              {footer}
            </div>
          </div>
        )}
      </div>
      {photo && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 440,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" height={560} style={{ objectFit: "contain" }} />
        </div>
      )}
    </div>
  );
}
