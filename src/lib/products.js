export const categories = [
  { id: "berries", label: "Berries" },
  { id: "tropical", label: "Tropical" },
  { id: "orchard", label: "Orchard" },
  { id: "mixes", label: "Mixes" },
];

export const products = [
  {
    slug: "freeze-dried-strawberries",
    name: "Freeze-Dried Strawberries",
    category: "berries",
    price: 7.5,
    weight: "30 g",
    emoji: "🍓",
    color: "from-pink-200 to-rose-100",
    tagline: "Bright, tangy and super crunchy.",
    description:
      "Whole sliced strawberries, frozen at peak ripeness and freeze-dried until light and crisp. They keep their bright red colour and melt on your tongue.",
    highlights: ["100% strawberries", "No added sugar", "Vitamin C"],
  },
  {
    slug: "freeze-dried-blueberries",
    name: "Freeze-Dried Blueberries",
    category: "berries",
    price: 8.5,
    weight: "25 g",
    emoji: "🫐",
    color: "from-indigo-200 to-violet-100",
    tagline: "Whole berries with a satisfying pop.",
    description:
      "Whole blueberries freeze-dried so each one shatters into a burst of jammy flavour. Great on yoghurt, cereal or straight from the pouch.",
    highlights: ["Whole berries", "Antioxidant-rich", "No added sugar"],
  },
  {
    slug: "freeze-dried-raspberries",
    name: "Freeze-Dried Raspberries",
    category: "berries",
    price: 8.5,
    weight: "20 g",
    emoji: "🍒",
    color: "from-rose-200 to-pink-100",
    tagline: "Tart, delicate and melt-in-your-mouth.",
    description:
      "Plump raspberries freeze-dried whole for an airy crunch and a sharp, fruity hit. Crumble them over desserts for colour and flavour.",
    highlights: ["100% raspberries", "High in fibre", "Vegan"],
  },
  {
    slug: "freeze-dried-mango",
    name: "Freeze-Dried Mango",
    category: "tropical",
    price: 7.5,
    weight: "30 g",
    emoji: "🥭",
    color: "from-yellow-200 to-orange-100",
    tagline: "Sunshine you can crunch.",
    description:
      "Ripe mango chunks freeze-dried until golden and crisp. All the sweetness of fresh mango with none of the mess.",
    highlights: ["100% mango", "Vitamin A & C", "No added sugar"],
  },
  {
    slug: "freeze-dried-pineapple",
    name: "Freeze-Dried Pineapple",
    category: "tropical",
    price: 7.0,
    weight: "30 g",
    emoji: "🍍",
    color: "from-lime-200 to-yellow-100",
    tagline: "Zesty, sweet and airy.",
    description:
      "Juicy pineapple pieces freeze-dried into a light, tangy crunch. A great lunchbox snack and a fun topping for smoothie bowls.",
    highlights: ["100% pineapple", "Gluten-free", "Vegan"],
  },
  {
    slug: "freeze-dried-banana",
    name: "Freeze-Dried Banana",
    category: "tropical",
    price: 6.0,
    weight: "35 g",
    emoji: "🍌",
    color: "from-yellow-100 to-amber-50",
    tagline: "Creamy flavour, crunchy bite.",
    description:
      "Banana slices freeze-dried, never fried, so they stay light and taste of real banana. Perfect for little hands.",
    highlights: ["Never fried", "Kid-friendly", "Energy boost"],
  },
  {
    slug: "freeze-dried-apple",
    name: "Freeze-Dried Apple",
    category: "orchard",
    price: 6.0,
    weight: "30 g",
    emoji: "🍎",
    color: "from-red-200 to-rose-100",
    tagline: "Crisp like a chip, sweet like an apple.",
    description:
      "Thin apple slices freeze-dried until crisp. A good swap for crisps, with nothing but apple in the pouch.",
    highlights: ["100% apple", "No added sugar", "Kid-friendly"],
  },
  {
    slug: "freeze-dried-peach",
    name: "Freeze-Dried Peach",
    category: "orchard",
    price: 7.5,
    weight: "30 g",
    emoji: "🍑",
    color: "from-orange-200 to-amber-100",
    tagline: "Summer peaches, all year round.",
    description:
      "Juicy peach slices freeze-dried at their ripest, so you get that sweet summer flavour in a light, crunchy bite.",
    highlights: ["100% peach", "No preservatives", "Vegan"],
  },
  {
    slug: "berry-crunch-mix",
    name: "Berry Crunch Mix",
    category: "mixes",
    price: 9.0,
    weight: "30 g",
    emoji: "🍇",
    color: "from-fuchsia-200 to-pink-100",
    tagline: "Strawberries, blueberries and raspberries.",
    description:
      "Our three freeze-dried berries in one pouch. Sweet, tart and crunchy, and great on porridge or in baking.",
    highlights: ["Best seller", "Antioxidant-rich", "No added sugar"],
  },
  {
    slug: "tropical-crunch-mix",
    name: "Tropical Crunch Mix",
    category: "mixes",
    price: 9.0,
    weight: "35 g",
    emoji: "🌴",
    color: "from-emerald-200 to-teal-100",
    tagline: "Mango, pineapple and banana.",
    description:
      "A sunny mix of freeze-dried tropical fruit. Made for hikes, desk drawers and afternoon slumps.",
    highlights: ["Mixed fruit", "On-the-go", "Vegan"],
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
