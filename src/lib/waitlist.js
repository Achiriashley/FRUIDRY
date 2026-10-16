import { randomBytes } from "node:crypto";
import { jsonFile, supabaseConfig, supabaseRequest } from "./storage";

// People who asked to hear on WhatsApp when a "coming soon" flavour is available: their
// number, the flavour and their language. Kept only until they've been told (the privacy
// page promises this), so the admin panel removes them after messaging them.

const waitlistFile = jsonFile("waitlist.json", []);

export const WAITLIST_ID_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;

function newEntry({ slug, phone, lang }) {
  return {
    id: randomBytes(9).toString("base64url"),
    slug,
    phone,
    lang,
    createdAt: new Date().toISOString(),
  };
}

const supabaseStore = {
  // The same number on the same flavour is only kept once.
  add: (config, entry) =>
    supabaseRequest(config, "waitlist", "?on_conflict=slug,phone", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify({
        id: entry.id,
        slug: entry.slug,
        phone: entry.phone,
        lang: entry.lang,
        created_at: entry.createdAt,
      }),
    }),
  async list(config) {
    const rows = await supabaseRequest(
      config,
      "waitlist",
      "?select=id,slug,phone,lang,created_at&order=created_at.asc&limit=10000",
    );
    return rows.map(({ created_at: createdAt, ...rest }) => ({ ...rest, createdAt }));
  },
  remove: (config, ids) =>
    supabaseRequest(config, "waitlist", `?id=in.(${ids.join(",")})`, { method: "DELETE" }),
  removeProduct: (config, slug) =>
    supabaseRequest(config, "waitlist", `?slug=eq.${encodeURIComponent(slug)}`, {
      method: "DELETE",
    }),
};

const fileStore = {
  add: (entry) =>
    waitlistFile.update((list) =>
      list.some((e) => e.slug === entry.slug && e.phone === entry.phone) ? list : [...list, entry],
    ),
  list: () => waitlistFile.read(),
  remove: (ids) => waitlistFile.update((list) => list.filter((e) => !ids.includes(e.id))),
  removeProduct: (slug) => waitlistFile.update((list) => list.filter((e) => e.slug !== slug)),
};

export async function addToWaitlist(details) {
  const config = supabaseConfig();
  const entry = newEntry(details);
  return config ? supabaseStore.add(config, entry) : fileStore.add(entry);
}

// Everyone waiting, oldest first.
export async function listWaitlist() {
  const config = supabaseConfig();
  return config ? supabaseStore.list(config) : fileStore.list();
}

export async function removeFromWaitlist(ids) {
  const valid = ids.filter((id) => WAITLIST_ID_PATTERN.test(id));
  if (valid.length === 0) return;
  const config = supabaseConfig();
  return config ? supabaseStore.remove(config, valid) : fileStore.remove(valid);
}

// When a product is deleted, its waiting list goes too.
export async function removeProductFromWaitlist(slug) {
  const config = supabaseConfig();
  return config ? supabaseStore.removeProduct(config, slug) : fileStore.removeProduct(slug);
}

// True when Supabase is set up but the waitlist table hasn't been created yet.
export function waitlistTableMissing(error) {
  return /PGRST205|42P01|Could not find the table|does not exist/i.test(error?.message ?? "");
}
