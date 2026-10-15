import { adminSessionStatus, isAdmin } from "@/lib/admin-auth";

const NO_STORE = { headers: { "Cache-Control": "no-store" } };

// Used by the admin pages (SessionGuard) to keep the sign-in going while the panel is
// in use. POST {"active": true} reports activity. Returns how long the session has been
// idle (in any tab) and how long it has left, or null once it has ended. This is a
// Route Handler rather than a Server Action so that refreshing the cookie doesn't
// reload the page's data.
export async function POST(request) {
  // JSON only: browsers won't send that from another website without asking first.
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return new Response(null, { status: 415 });
  }
  // Without a valid sign-in the answer is null, and the request body isn't even read.
  if (!(await isAdmin())) return Response.json(null, NO_STORE);
  const body = await request.json().catch(() => null);
  return Response.json(await adminSessionStatus({ active: body?.active === true }), NO_STORE);
}
