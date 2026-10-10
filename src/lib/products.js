export const categories = [{ id: "mixes", label: "Mixes" }];

export const products = [
  {
    slug: "mixed-fruit-pack",
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
  },
];

export function getProduct(slug) {
  return products.find((p) => p.slug === slug);
}

export function formatPrice(value) {
  return new Intl.NumberFormat("fr-CM", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(value);
}
