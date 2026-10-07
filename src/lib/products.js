export const categories = [
  { id: "classics", label: "Classics" },
  { id: "tropical", label: "Tropical" },
  { id: "berries", label: "Berries" },
  { id: "mixes", label: "Mixes" },
];

export const products = [
  {
    slug: "sun-dried-apricots",
    name: "Sun-Dried Apricots",
    category: "classics",
    price: 8.5,
    weight: "250 g",
    emoji: "🍑",
    color: "from-orange-200 to-amber-100",
    tagline: "Soft, tangy and naturally sweet.",
    description:
      "Whole apricots dried slowly in the sun until they turn chewy and rich. No added sugar and no sulphites.",
    highlights: ["No added sugar", "Sulphite-free", "High in fibre"],
  },
  {
    slug: "crispy-apple-rings",
    name: "Crispy Apple Rings",
    category: "classics",
    price: 6.0,
    weight: "150 g",
    emoji: "🍎",
    color: "from-red-200 to-rose-100",
    tagline: "A light crunch with every bite.",
    description:
      "Thin slices of orchard apples, air-dried until crisp. A good swap for crisps in a lunchbox.",
    highlights: ["100% apple", "Air-dried", "Kid-friendly"],
  },
  {
    slug: "medjool-dates",
    name: "Medjool Dates",
    category: "classics",
    price: 11.0,
    weight: "300 g",
    emoji: "🌰",
    color: "from-amber-300 to-yellow-100",
    tagline: "Caramel-like and melt-in-your-mouth.",
    description:
      "Large, plump Medjool dates with a soft, fudgy texture. Eat them as they are or use them as a natural sweetener in baking.",
    highlights: ["Naturally sweet", "Rich in potassium", "Great for baking"],
  },
  {
    slug: "golden-mango-slices",
    name: "Golden Mango Slices",
    category: "tropical",
    price: 9.5,
    weight: "200 g",
    emoji: "🥭",
    color: "from-yellow-200 to-orange-100",
    tagline: "Sunshine in a pouch.",
    description:
      "Ripe mangoes cut into thick slices and gently dehydrated so they stay juicy and chewy.",
    highlights: ["No added sugar", "Vitamin A & C", "Vegan"],
  },
  {
    slug: "pineapple-chunks",
    name: "Pineapple Chunks",
    category: "tropical",
    price: 8.0,
    weight: "200 g",
    emoji: "🍍",
    color: "from-lime-200 to-yellow-100",
    tagline: "Bright, zesty and chewy.",
    description:
      "Bite-sized chunks of sweet pineapple with a tangy finish. Good in trail mix or on their own.",
    highlights: ["Tangy-sweet", "Vegan", "Gluten-free"],
  },
  {
    slug: "banana-chips",
    name: "Banana Chips",
    category: "tropical",
    price: 5.5,
    weight: "200 g",
    emoji: "🍌",
    color: "from-yellow-100 to-amber-50",
    tagline: "The classic crunchy snack.",
    description:
      "Thinly sliced bananas, dried to a satisfying crunch. Sprinkle them on yoghurt or porridge.",
    highlights: ["Crunchy", "Energy boost", "Vegan"],
  },
  {
    slug: "wild-blueberries",
    name: "Wild Blueberries",
    category: "berries",
    price: 12.0,
    weight: "150 g",
    emoji: "🫐",
    color: "from-indigo-200 to-violet-100",
    tagline: "Small berries, big flavour.",
    description:
      "Wild-harvested blueberries, dried to concentrate their deep, jammy flavour. Packed with antioxidants.",
    highlights: ["Antioxidant-rich", "Wild harvested", "No added sugar"],
  },
  {
    slug: "strawberry-slices",
    name: "Strawberry Slices",
    category: "berries",
    price: 10.0,
    weight: "100 g",
    emoji: "🍓",
    color: "from-pink-200 to-rose-100",
    tagline: "Freeze-dried and crunchy.",
    description:
      "Freeze-dried strawberries that keep their bright colour and flavour. They melt on your tongue.",
    highlights: ["Freeze-dried", "Vitamin C", "Light & crunchy"],
  },
  {
    slug: "tropical-trail-mix",
    name: "Tropical Trail Mix",
    category: "mixes",
    price: 9.0,
    weight: "250 g",
    emoji: "🥥",
    color: "from-emerald-200 to-teal-100",
    tagline: "Mango, pineapple, coconut and banana.",
    description:
      "Our best-selling mix of tropical fruit with toasted coconut flakes. Made for hikes and afternoon slumps.",
    highlights: ["Best seller", "Mixed fruit", "On-the-go"],
  },
  {
    slug: "berry-medley",
    name: "Berry Medley",
    category: "mixes",
    price: 11.5,
    weight: "200 g",
    emoji: "🍒",
    color: "from-fuchsia-200 to-pink-100",
    tagline: "Blueberries, cranberries, cherries and goji.",
    description:
      "A tart and sweet blend of dried berries. Good in salads, granola or your favourite bake.",
    highlights: ["Superfood blend", "Antioxidant-rich", "Vegan"],
  },
];

export function getProduct(slug) {
  return products.find((p) => p.slug === slug);
}

export function formatPrice(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}
