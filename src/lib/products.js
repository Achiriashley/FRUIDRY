export const categories = [
  { id: "mixes", label: "Mixes" },
  { id: "fruits", label: "Fruits" },
];

const HIGHLIGHTS = ["100% fruit", "No added sugar", "No preservatives"];
const HIGHLIGHTS_FR = ["100 % fruit", "Sans sucre ajouté", "Sans conservateurs"];

// Starting details for each product. Price, text and stock can be changed later
// from the admin panel (/admin/products), which saves its edits on top of these.
// Photos are in public/products/<slug>.png. The *Fr fields are shown on the French
// site (/fr). "Coming soon" products are shown but can't be ordered until that box
// is unticked in the admin panel.
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
    color: "from-sun-light to-brand-light",
    tagline: "A crunchy mix of freeze-dried fruit.",
    description:
      "A delicious blend of freeze-dried strawberries, mango, apple, pineapple, banana, kiwi, dragon fruit, passion fruit and more, frozen at peak ripeness and dried until light and crunchy. Eat it straight from the pack, or sprinkle it on yoghurt, oats or ice cream.",
    highlights: ["100% fruit", "No added sugar", "No preservatives", "Light & crunchy"],
    nameFr: "Mélange de fruits",
    taglineFr: "Un mélange croquant de fruits lyophilisés.",
    descriptionFr:
      "Un délicieux mélange de fraise, mangue, pomme, ananas, banane, kiwi, fruit du dragon, fruit de la passion et bien plus encore, congelés à pleine maturité puis séchés jusqu'à devenir légers et croquants. À croquer directement dans le sachet, ou à parsemer sur un yaourt, des flocons d'avoine ou une glace.",
    highlightsFr: ["100 % fruit", "Sans sucre ajouté", "Sans conservateurs", "Léger et croquant"],
    inStock: true,
    comingSoon: false,
  },
  {
    slug: "mango-pack",
    sku: "FD-MANGO-50",
    name: "Mango",
    category: "fruits",
    price: 2500,
    weight: "50 g",
    emoji: "🥭",
    color: "from-sun-light to-cream",
    tagline: "Sweet, tropical freeze-dried mango.",
    description:
      "A delicious burst of sweet and tropical mango, freeze-dried to preserve its natural flavour, nutrients and goodness. Enjoy it straight from the pack, or add it to yoghurt, cereal, smoothies and desserts.",
    highlights: HIGHLIGHTS,
    nameFr: "Mangue",
    taglineFr: "De la mangue tropicale lyophilisée, douce et sucrée.",
    descriptionFr:
      "Une délicieuse explosion de mangue douce et tropicale, lyophilisée pour préserver sa saveur naturelle, ses nutriments et tous ses bienfaits. À déguster directement dans le sachet, ou à ajouter à vos yaourts, céréales, smoothies et desserts.",
    highlightsFr: HIGHLIGHTS_FR,
    inStock: true,
    comingSoon: true,
  },
  {
    slug: "strawberry-pack",
    sku: "FD-STRAW-50",
    name: "Strawberries",
    category: "fruits",
    price: 2500,
    weight: "50 g",
    emoji: "🍓",
    color: "from-rose-100 to-cream",
    tagline: "Naturally sweet freeze-dried strawberries.",
    description:
      "Naturally sweet and delicious freeze-dried strawberries, full of real fruit flavour and goodness. Enjoy them straight from the pack, on yoghurt, oats or ice cream.",
    highlights: HIGHLIGHTS,
    nameFr: "Fraises",
    taglineFr: "Des fraises lyophilisées naturellement sucrées.",
    descriptionFr:
      "De délicieuses fraises lyophilisées, naturellement sucrées, pleines du vrai goût du fruit et de ses bienfaits. À déguster nature, sur un yaourt, des flocons d'avoine ou une glace.",
    highlightsFr: HIGHLIGHTS_FR,
    inStock: true,
    comingSoon: true,
  },
  {
    slug: "pineapple-pack",
    sku: "FD-PINE-50",
    name: "Pineapple",
    category: "fruits",
    price: 2500,
    weight: "50 g",
    emoji: "🍍",
    color: "from-sun-light to-cream",
    tagline: "Crunchy freeze-dried pineapple rings.",
    description:
      "Deliciously sweet and naturally nutritious, our freeze-dried pineapple is made from 100% real fruit, carefully processed to lock in flavour, colour and nutrients. The perfect healthy snack for any time, anywhere.",
    highlights: HIGHLIGHTS,
    nameFr: "Ananas",
    taglineFr: "Des rondelles d'ananas lyophilisées et croquantes.",
    descriptionFr:
      "Délicieusement sucré et naturellement nutritif, notre ananas lyophilisé est 100 % fruit, préparé avec soin pour préserver sa saveur, sa couleur et ses nutriments. Le snack sain idéal, à tout moment et partout.",
    highlightsFr: HIGHLIGHTS_FR,
    inStock: true,
    comingSoon: true,
  },
  {
    slug: "apple-pack",
    sku: "FD-APPLE-50",
    name: "Apple",
    category: "fruits",
    price: 2500,
    weight: "50 g",
    emoji: "🍎",
    color: "from-rose-50 to-brand-light",
    tagline: "Crisp freeze-dried apple rings.",
    description:
      "Deliciously crisp freeze-dried apple rings, with a naturally sweet taste and all the goodness of real fruit. Enjoy them straight from the pack, on yoghurt, oats or ice cream, or in your recipes.",
    highlights: HIGHLIGHTS,
    nameFr: "Pomme",
    taglineFr: "Des rondelles de pomme lyophilisées et croustillantes.",
    descriptionFr:
      "De délicieuses rondelles de pomme lyophilisées, naturellement sucrées et pleines de tous les bienfaits du vrai fruit. À déguster nature, sur un yaourt, des flocons d'avoine ou une glace, ou dans vos recettes.",
    highlightsFr: HIGHLIGHTS_FR,
    inStock: true,
    comingSoon: true,
  },
];

// Whether customers can order this product right now.
export function isOrderable(product) {
  return Boolean(product?.inStock && !product.comingSoon);
}

export function formatPrice(value) {
  return new Intl.NumberFormat("fr-CM", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(value);
}
