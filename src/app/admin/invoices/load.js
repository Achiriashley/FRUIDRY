import { getProducts } from "@/lib/catalog";
import { listClients } from "@/lib/clients";
import { getInvoiceSettings } from "@/lib/invoices";
import { tableMissing } from "@/lib/storage";

// What the invoice form needs: saved clients, products to pick from and the settings.
// `setupNeeded` when Supabase doesn't have the invoice tables yet.
export async function loadFormData() {
  try {
    const [clients, products, settings] = await Promise.all([
      listClients(),
      getProducts(),
      getInvoiceSettings(),
    ]);
    return {
      setupNeeded: false,
      clients,
      settings,
      products: products.map(({ slug, name, nameFr, sku, price }) => ({
        slug,
        name,
        nameFr: nameFr ?? "",
        sku: sku ?? "",
        price,
      })),
    };
  } catch (error) {
    if (!tableMissing(error)) throw error;
    return { setupNeeded: true };
  }
}
