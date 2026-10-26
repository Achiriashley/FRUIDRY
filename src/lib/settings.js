import { jsonFile, supabaseConfig, supabaseRequest, tableMissing } from "./storage";

// Settings edited in the admin panel, one record per subject (for example "invoices").

const settingsFile = jsonFile("settings.json", {});

// The saved settings for a subject, or null if none were saved yet (or the Supabase
// table doesn't exist yet).
export async function readSettings(key) {
  const config = supabaseConfig();
  if (!config) return (await settingsFile.read())[key] ?? null;
  try {
    const rows = await supabaseRequest(
      config,
      "settings",
      `?key=eq.${encodeURIComponent(key)}&select=data`,
    );
    return rows?.[0]?.data ?? null;
  } catch (error) {
    if (tableMissing(error)) return null;
    throw error;
  }
}

export async function writeSettings(key, data) {
  const config = supabaseConfig();
  if (!config) {
    await settingsFile.update((all) => ({ ...all, [key]: data }));
    return;
  }
  await supabaseRequest(config, "settings", "?on_conflict=key", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ key, data, updated_at: new Date().toISOString() }),
  });
}
