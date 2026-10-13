// The picture shown when a Fruidry link is shared (WhatsApp, Facebook, ...).
// Plain shapes and text only, so it renders without downloading anything.

export const OG_SIZE = { width: 1200, height: 630 };

const FRUIT_COLOURS = ["#f43f5e", "#f59e0b", "#6366f1", "#ef4444", "#facc15", "#fb923c"];

// The default font lacks the narrow spaces used in "2 500 FCFA".
const plain = (text) => text?.replace(/[\u00a0\u202f]/g, " ");

export function OgCard({ title, subtitle, footer, photo }) {
  [title, subtitle, footer] = [plain(title), plain(subtitle), plain(footer)];
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "linear-gradient(135deg, #ffedd5 0%, #fffbeb 55%, #fffaf3 100%)",
        fontFamily: "sans-serif",
        color: "#1c1917",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 72px",
          width: photo ? 660 : 1200,
        }}
      >
        <div style={{ display: "flex", fontSize: 44, fontWeight: 800, color: "#e8590c" }}>
          Fruidry
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: photo ? 60 : 72,
            fontWeight: 800,
            lineHeight: 1.1,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div style={{ display: "flex", marginTop: 24, fontSize: 34, color: "#57534e" }}>
            {subtitle}
          </div>
        )}
        <div style={{ display: "flex", marginTop: 40, gap: 16, alignItems: "center" }}>
          {!photo &&
            FRUIT_COLOURS.map((colour) => (
              <div
                key={colour}
                style={{ width: 44, height: 44, borderRadius: 22, background: colour }}
              />
            ))}
          {footer && (
            <div
              style={{
                display: "flex",
                marginLeft: photo ? 0 : 16,
                fontSize: 30,
                fontWeight: 700,
                color: "#c2410c",
              }}
            >
              {footer}
            </div>
          )}
        </div>
      </div>
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" width={540} height={630} style={{ objectFit: "cover" }} />
      )}
    </div>
  );
}
