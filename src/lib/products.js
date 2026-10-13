export const categories = [{ id: "mixes", label: "Mixes" }];

// Starting details for each product. Price, text and stock can be changed later
// from the admin panel (/admin/products), which saves its edits on top of these.
export const defaultProducts = [
  {
    slug: "mixed-fruit-pack",
    // Item code customers quote on WhatsApp.
    sku: "FD-MIX-50",
    name: "Mixed Fruit Pack",
    category: "mixes",
    price: 2500,
    weight: "50 g",
    emoji: "🍓",
    color: "from-fuchsia-200 to-orange-100",
    tagline: "A crunchy mix of freeze-dried fruit.",
    description:
      "Our signature pack: a colourful mix of freeze-dried fruit, frozen at peak ripeness and dried until light and crunchy. Eat it straight from the pouch, or sprinkle it on yoghurt, cereal or porridge.",
    highlights: ["100% fruit", "No added sugar", "No preservatives", "Light & crunchy"],
    // French versions, shown on the French site (/fr).
    nameFr: "Mélange de fruits",
    taglineFr: "Un mélange croquant de fruits lyophilisés.",
    descriptionFr:
      "Notre sachet signature : un mélange coloré de fruits lyophilisés, congelés à pleine maturité puis séchés jusqu'à devenir légers et croquants. À croquer directement dans le sachet, ou à parsemer sur un yaourt, des céréales ou une bouillie.",
    highlightsFr: ["100 % fruit", "Sans sucre ajouté", "Sans conservateurs", "Léger et croquant"],
    inStock: true,
  },
];

export function formatPrice(value) {
  return new Intl.NumberFormat("fr-CM", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(value);
}
