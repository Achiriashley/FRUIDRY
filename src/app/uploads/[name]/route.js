import { readLocalImage } from "@/lib/storage";

// Serves product photos uploaded while running without Supabase (local development).
export async function GET(_request, { params }) {
  const { name } = await params;
  const image = await readLocalImage(name);
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(image.bytes, {
    headers: { "Content-Type": image.type, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
