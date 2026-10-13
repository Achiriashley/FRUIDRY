// The shop is in French and English. Each language has its own web addresses
// (/fr/... and /en/...) so search engines can list both.

export const LOCALES = ["fr", "en"];
export const DEFAULT_LOCALE = "fr";
export const LOCALE_COOKIE = "fruidry_lang";

export function hasLocale(value) {
  return LOCALES.includes(value);
}

export function otherLocale(lang) {
  return lang === "fr" ? "en" : "fr";
}

// "/shop" -> "/fr/shop"; "/" -> "/fr"
export function localePath(lang, path = "/") {
  return path === "/" ? `/${lang}` : `/${lang}${path}`;
}

// Fields with a French version stored next to the English one (nameFr, ...).
export const TRANSLATED_FIELDS = ["name", "tagline", "description", "highlights"];

// The product as shown in the given language. French falls back to English
// wherever no French text has been written yet.
export function localizeProduct(product, lang) {
  if (lang !== "fr") return product;
  const localized = { ...product };
  for (const field of TRANSLATED_FIELDS) {
    const french = product[`${field}Fr`];
    if (Array.isArray(french) ? french.length > 0 : french) localized[field] = french;
  }
  return localized;
}

export function formatDate(iso, lang) {
  return new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Douala",
  }).format(new Date(iso));
}

const en = {
  meta: {
    siteTitle: "Fruidry | Freeze-dried fruit",
    siteDescription:
      "Fruidry makes crunchy freeze-dried fruit snacks with no added sugar and no preservatives. Order on WhatsApp in Cameroon.",
    ogLocale: "en_GB",
  },
  nav: { shop: "Shop", about: "Our story", contact: "Contact", cart: "Cart", home: "Fruidry home" },
  language: { switchTo: "Français", switchLabel: "Voir le site en français" },
  footer: {
    tagline: "Freeze-dried fruit snacks with nothing added and nothing hidden.",
    explore: "Explore",
    shopAll: "Shop all",
    promise: "Promise",
    promises: ["No added sugar", "No preservatives", "Freeze-dried, never fried"],
    rights: "All rights reserved.",
  },
  categories: { mixes: "Mixes", fruits: "Fruits" },
  home: {
    badge: "100% fruit · 0% fuss",
    titleBefore: "Freeze-dried fruit, ",
    titleHighlight: "naturally",
    titleAfter: " delicious.",
    intro:
      "Fruidry brings you ripe fruit, freeze-dried for real flavour and a satisfying crunch, with nothing added.",
    eyebrow: "Founded in Cameroon",
    shopNow: "Shop now",
    orderNow: "Order now",
    ourStory: "Our story",
    priceFrom: (price) => `From ${price}`,
    orderHint: "Order in a few taps on WhatsApp.",
    values: [
      {
        icon: "❄️",
        title: "Freeze-dried",
        text: "Frozen fresh, then dried under vacuum with no high heat, so the flavour, colour and nutrients stay in.",
      },
      {
        icon: "🌱",
        title: "Nothing added",
        text: "No added sugar, sulphites or preservatives. Just fruit.",
      },
      {
        icon: "✨",
        title: "Stays crunchy",
        text: "Light and crunchy, and resealable pouches keep every piece crisp.",
      },
    ],
    comingSoon: "New products are coming soon.",
    ourRange: "Our range",
    viewAll: "View all →",
    ourPack: "Our pack",
    moreDetails: "More details →",
  },
  shop: {
    title: "Shop",
    description: "Browse every Fruidry freeze-dried fruit snack. Order on WhatsApp in Cameroon.",
    intro: "Every pouch is just fruit, freeze-dried for crunch.",
    all: "All",
    filterLabel: "Filter by category",
  },
  comingSoon: {
    badge: "Coming soon",
    heading: "More flavours on the way",
    intro: "New Fruidry flavours, arriving soon.",
    notYet: "This flavour isn't available to order yet. Check back soon!",
  },
  product: {
    notFound: "Product not found",
    backToShop: "← Back to shop",
    itemCode: "Item code",
    related: "You might also like",
    soldOut: "Sold out",
    decrease: "Decrease quantity",
    increase: "Increase quantity",
    added: "Added ✓",
    addToCart: "Add to cart",
    buyNow: "Buy now",
  },
  about: {
    title: "Our story",
    description: "How Fruidry started, where our fruit comes from and how freeze-drying works.",
    paragraphs: [
      "Fruidry was founded in Cameroon with a simple idea: make healthy, tasty fruit snacks easy to enjoy every day. No added sugar, no preservatives, just fruit.",
      "For now, our fruit is freeze-dried by a partner producer in China and imported to Cameroon by us.",
      "Our goal is to freeze-dry fruit grown in Cameroon, right here at home, as soon as we have our own freeze-drying machine.",
    ],
    howWeMakeIt: "How freeze-drying works",
    steps: [
      {
        n: "01",
        title: "Picked ripe",
        text: "The fruit is chosen at peak ripeness, when it's at its sweetest.",
      },
      {
        n: "02",
        title: "Frozen fast",
        text: "It's washed, sliced and quickly frozen to lock in its flavour and colour.",
      },
      {
        n: "03",
        title: "Dried under vacuum",
        text: "A vacuum turns the ice straight into vapour, with no high heat, so the fruit keeps its taste and nutrients and becomes light and crunchy.",
      },
      {
        n: "04",
        title: "Sealed airtight",
        text: "It's sealed in airtight, resealable pouches that keep every piece crisp.",
      },
    ],
    tasteTheDifference: "Taste the difference",
    shopTheRange: "Shop the range",
  },
  contact: {
    title: "Contact",
    description: "Get in touch with Fruidry by WhatsApp, phone or social media.",
    heading: "Say hello",
    intro:
      "Questions about an order, wholesale or our fruit? Chat with us on WhatsApp, give us a call, or write your message below.",
    chatOnWhatsApp: "Chat on WhatsApp",
    chatGreeting: "Hello Fruidry! I have a question.",
    call: "Call us",
    followUs: "Follow us",
    location: "Bonabéri, Douala, Cameroon",
    name: "Name",
    email: "Email",
    optional: "(optional)",
    message: "Message",
    sending: "Preparing your message…",
    send: "Send on WhatsApp",
    almostDone: "Almost done!",
    ready: "Your message is ready in WhatsApp. Press send there and we'll reply soon.",
    openAgain: "Open WhatsApp again",
    newMessage: "Write another message",
    whatsappGreeting: "Hello Fruidry!",
    whatsappFrom: "From:",
    errors: {
      name: "Please tell us your name.",
      nameTooLong: "Please keep your name under 100 characters.",
      email: "Please enter a valid email address, or leave it empty.",
      messageTooShort: "Your message should be at least 10 characters.",
      messageTooLong: "Please keep your message under 2000 characters.",
      rateLimited: (wait) => `Too many messages sent just now. Please try again in ${wait}.`,
      notSetUp: "Messaging on WhatsApp isn't set up yet. Please call us instead.",
    },
  },
  cart: {
    title: "Your cart",
    empty: "Your cart is empty",
    emptyHint: "Find a snack you love in the shop.",
    browse: "Browse the shop",
    remove: "Remove",
    decrease: (name) => `Decrease ${name} quantity`,
    increase: (name) => `Increase ${name} quantity`,
    summary: "Order summary",
    total: "Total",
    howItWorks:
      "At checkout your order opens in WhatsApp, and we'll reply to arrange payment and delivery.",
    checkout: "Checkout",
  },
  checkout: {
    title: "Checkout",
    yourDetails: "Your details",
    fullName: "Full name",
    phone: "Phone number",
    address: "Delivery address",
    addressPlaceholder: "Town, neighbourhood and a landmark",
    notes: "Notes",
    optional: "(optional)",
    howItWorks:
      "Your order opens in WhatsApp with everything filled in. Just press send, and we'll reply to arrange payment and delivery.",
    preparing: "Preparing your order…",
    orderOnWhatsApp: "Order on WhatsApp",
    almostDone: "Almost done!",
    readyBefore: "Your order ",
    readyMiddle: " is ready in WhatsApp. Press ",
    readySend: "send",
    readyAfter: " there to place it, and we'll reply to arrange payment and delivery.",
    openAgain: "Open WhatsApp again",
    viewOrder: "View your order",
    receiptHint: "(your receipt appears there once we confirm payment)",
    errors: {
      name: "Please enter your name.",
      nameTooLong: "Please keep your name under 100 characters.",
      phone: "Enter a Cameroon mobile number, e.g. 6XX XX XX XX.",
      address: "Tell us where to deliver your order.",
      addressTooLong: "Please keep the address under 300 characters.",
      cart: "Your cart is empty or out of date. Please refresh the page.",
      soldOut: (name) => `Sorry, ${name} is sold out. Remove it from your cart to continue.`,
      notAvailable: (name) =>
        `Sorry, ${name} isn't available to order yet. Remove it from your cart to continue.`,
      rateLimited: (wait) =>
        `You've placed a lot of orders just now. Please try again in ${wait}, or message us on WhatsApp.`,
      notSetUp: "Ordering on WhatsApp isn't set up yet. Please contact us directly.",
    },
  },
  whatsapp: {
    colon: ":",
    greeting: "Hello Fruidry! I'd like to order:",
    order: "Order",
    total: "Total",
    name: "Name",
    phone: "Phone",
    delivery: "Delivery",
    note: "Note",
  },
  order: {
    title: "Your order",
    loading: "Loading your order…",
    order: "Order",
    cancelled: "This order was cancelled",
    received: "We've got your order",
    placed: "Placed",
    total: "Total",
    nextSteps:
      "We'll reply on WhatsApp to arrange payment and delivery. Once your payment is confirmed, your receipt will appear on this page.",
    sendAgain: "Send the order on WhatsApp again",
  },
  receipt: {
    paymentConfirmed: "Payment confirmed",
    thanksDelivered: (name, date) => `Thank you, ${name}! Your order was delivered on ${date}.`,
    thanks: (name) => `Thank you, ${name}! We'll call you to arrange delivery.`,
    brandLine: "Freeze-dried fruit",
    receipt: "Receipt",
    order: "Order",
    paidOn: "Paid on",
    customer: "Customer",
    phone: "Phone",
    deliverTo: "Deliver to",
    item: "Item",
    qty: "Qty",
    amount: "Amount",
    totalPaid: "Total paid",
    confirmedBy: "Payment confirmed by Fruidry",
    transactionId: "Transaction ID",
    print: "Print or save as PDF",
  },
  notFound: {
    title: "Page not found",
    text: "This page has dried up. Try the shop instead.",
    goToShop: "Go to the shop",
  },
  wait: (minutes) => (minutes <= 1 ? "a minute" : `${minutes} minutes`),
};

const fr = {
  meta: {
    siteTitle: "Fruidry | Fruits lyophilisés",
    siteDescription:
      "Fruidry fabrique des snacks de fruits lyophilisés croquants, sans sucre ajouté ni conservateurs. Commandez sur WhatsApp au Cameroun.",
    ogLocale: "fr_FR",
  },
  nav: {
    shop: "Boutique",
    about: "Notre histoire",
    contact: "Contact",
    cart: "Panier",
    home: "Accueil Fruidry",
  },
  language: { switchTo: "English", switchLabel: "View the site in English" },
  footer: {
    tagline: "Des snacks de fruits lyophilisés, sans rien d'ajouté ni de caché.",
    explore: "Explorer",
    shopAll: "Toute la boutique",
    promise: "Notre promesse",
    promises: ["Sans sucre ajouté", "Sans conservateurs", "Lyophilisé, jamais frit"],
    rights: "Tous droits réservés.",
  },
  categories: { mixes: "Mélanges", fruits: "Fruits" },
  home: {
    badge: "100 % fruit · rien d'autre",
    titleBefore: "Des fruits lyophilisés, ",
    titleHighlight: "naturellement",
    titleAfter: " délicieux.",
    intro:
      "Fruidry vous apporte des fruits mûrs, lyophilisés pour leur vraie saveur et un croquant irrésistible, sans rien d'ajouté.",
    eyebrow: "Fondé au Cameroun",
    shopNow: "Acheter",
    orderNow: "Commander",
    ourStory: "Notre histoire",
    priceFrom: (price) => `À partir de ${price}`,
    orderHint: "Commandez en quelques clics sur WhatsApp.",
    values: [
      {
        icon: "❄️",
        title: "Lyophilisé",
        text: "Congelé frais, puis séché sous vide sans forte chaleur : la saveur, la couleur et les nutriments sont préservés.",
      },
      {
        icon: "🌱",
        title: "Rien d'ajouté",
        text: "Sans sucre ajouté, sans sulfites ni conservateurs. Juste du fruit.",
      },
      {
        icon: "✨",
        title: "Reste croquant",
        text: "Léger et croquant, et le sachet refermable garde chaque morceau croustillant.",
      },
    ],
    comingSoon: "De nouveaux produits arrivent bientôt.",
    ourRange: "Notre gamme",
    viewAll: "Tout voir →",
    ourPack: "Notre sachet",
    moreDetails: "Plus de détails →",
  },
  shop: {
    title: "Boutique",
    description:
      "Découvrez tous les snacks de fruits lyophilisés Fruidry. Commandez sur WhatsApp au Cameroun.",
    intro: "Chaque sachet, c'est juste du fruit, lyophilisé pour le croquant.",
    all: "Tout",
    filterLabel: "Filtrer par catégorie",
  },
  comingSoon: {
    badge: "Bientôt disponible",
    heading: "D'autres saveurs arrivent",
    intro: "De nouvelles saveurs Fruidry, bientôt disponibles.",
    notYet: "Cette saveur n'est pas encore disponible à la commande. Revenez bientôt !",
  },
  product: {
    notFound: "Produit introuvable",
    backToShop: "← Retour à la boutique",
    itemCode: "Code article",
    related: "Vous aimerez aussi",
    soldOut: "Épuisé",
    decrease: "Diminuer la quantité",
    increase: "Augmenter la quantité",
    added: "Ajouté ✓",
    addToCart: "Ajouter au panier",
    buyNow: "Acheter maintenant",
  },
  about: {
    title: "Notre histoire",
    description:
      "Comment Fruidry est né, d'où viennent nos fruits et comment fonctionne la lyophilisation.",
    paragraphs: [
      "Fruidry a été fondé au Cameroun avec une idée simple : rendre les snacks aux fruits sains et savoureux faciles à apprécier au quotidien. Sans sucre ajouté, sans conservateurs, juste du fruit.",
      "Pour l'instant, nos fruits sont lyophilisés par un producteur partenaire en Chine, puis importés au Cameroun par nos soins.",
      "Notre objectif : lyophiliser des fruits cultivés au Cameroun, ici même, dès que nous aurons notre propre machine de lyophilisation.",
    ],
    howWeMakeIt: "Comment fonctionne la lyophilisation",
    steps: [
      {
        n: "01",
        title: "Cueilli à maturité",
        text: "Les fruits sont choisis à pleine maturité, quand ils sont les plus sucrés.",
      },
      {
        n: "02",
        title: "Congelé rapidement",
        text: "Ils sont lavés, tranchés puis congelés rapidement pour préserver leur saveur et leur couleur.",
      },
      {
        n: "03",
        title: "Séché sous vide",
        text: "Le vide transforme la glace directement en vapeur, sans forte chaleur : le fruit garde son goût et ses nutriments, et devient léger et croquant.",
      },
      {
        n: "04",
        title: "Scellé hermétiquement",
        text: "Il est scellé dans des sachets hermétiques et refermables qui gardent chaque morceau croustillant.",
      },
    ],
    tasteTheDifference: "Goûtez la différence",
    shopTheRange: "Découvrir la gamme",
  },
  contact: {
    title: "Contact",
    description: "Contactez Fruidry sur WhatsApp, par téléphone ou sur les réseaux sociaux.",
    heading: "Écrivez-nous",
    intro:
      "Une question sur une commande, la vente en gros ou nos fruits ? Écrivez-nous sur WhatsApp, appelez-nous, ou laissez votre message ci-dessous.",
    chatOnWhatsApp: "Discuter sur WhatsApp",
    chatGreeting: "Bonjour Fruidry ! J'ai une question.",
    call: "Appelez-nous",
    followUs: "Suivez-nous",
    location: "Bonabéri, Douala, Cameroun",
    name: "Nom",
    email: "E-mail",
    optional: "(facultatif)",
    message: "Message",
    sending: "Préparation de votre message…",
    send: "Envoyer sur WhatsApp",
    almostDone: "Presque fini !",
    ready: "Votre message est prêt dans WhatsApp. Appuyez sur envoyer et nous vous répondrons rapidement.",
    openAgain: "Rouvrir WhatsApp",
    newMessage: "Écrire un autre message",
    whatsappGreeting: "Bonjour Fruidry !",
    whatsappFrom: "De la part de :",
    errors: {
      name: "Veuillez indiquer votre nom.",
      nameTooLong: "Votre nom doit faire moins de 100 caractères.",
      email: "Veuillez saisir une adresse e-mail valide, ou laisser ce champ vide.",
      messageTooShort: "Votre message doit contenir au moins 10 caractères.",
      messageTooLong: "Votre message doit faire moins de 2000 caractères.",
      rateLimited: (wait) => `Trop de messages envoyés à l'instant. Réessayez dans ${wait}.`,
      notSetUp: "L'envoi de messages sur WhatsApp n'est pas encore configuré. Appelez-nous plutôt.",
    },
  },
  cart: {
    title: "Votre panier",
    empty: "Votre panier est vide",
    emptyHint: "Trouvez votre snack préféré dans la boutique.",
    browse: "Voir la boutique",
    remove: "Retirer",
    decrease: (name) => `Diminuer la quantité de ${name}`,
    increase: (name) => `Augmenter la quantité de ${name}`,
    summary: "Récapitulatif",
    total: "Total",
    howItWorks:
      "Au moment de commander, votre commande s'ouvre dans WhatsApp et nous vous répondons pour organiser le paiement et la livraison.",
    checkout: "Commander",
  },
  checkout: {
    title: "Finaliser la commande",
    yourDetails: "Vos coordonnées",
    fullName: "Nom complet",
    phone: "Numéro de téléphone",
    address: "Adresse de livraison",
    addressPlaceholder: "Ville, quartier et un point de repère",
    notes: "Remarques",
    optional: "(facultatif)",
    howItWorks:
      "Votre commande s'ouvre dans WhatsApp, déjà remplie. Appuyez simplement sur envoyer, et nous vous répondrons pour organiser le paiement et la livraison.",
    preparing: "Préparation de votre commande…",
    orderOnWhatsApp: "Commander sur WhatsApp",
    almostDone: "Presque fini !",
    readyBefore: "Votre commande ",
    readyMiddle: " est prête dans WhatsApp. Appuyez sur ",
    readySend: "envoyer",
    readyAfter: " pour la passer, et nous vous répondrons pour organiser le paiement et la livraison.",
    openAgain: "Rouvrir WhatsApp",
    viewOrder: "Voir votre commande",
    receiptHint: "(votre reçu y apparaîtra dès que nous aurons confirmé le paiement)",
    errors: {
      name: "Veuillez saisir votre nom.",
      nameTooLong: "Votre nom doit faire moins de 100 caractères.",
      phone: "Saisissez un numéro mobile camerounais, par ex. 6XX XX XX XX.",
      address: "Indiquez-nous où livrer votre commande.",
      addressTooLong: "L'adresse doit faire moins de 300 caractères.",
      cart: "Votre panier est vide ou n'est plus à jour. Veuillez actualiser la page.",
      soldOut: (name) => `Désolé, ${name} est épuisé. Retirez-le de votre panier pour continuer.`,
      notAvailable: (name) =>
        `Désolé, ${name} n'est pas encore disponible. Retirez-le de votre panier pour continuer.`,
      rateLimited: (wait) =>
        `Vous avez passé beaucoup de commandes à l'instant. Réessayez dans ${wait} ou écrivez-nous sur WhatsApp.`,
      notSetUp:
        "La commande sur WhatsApp n'est pas encore configurée. Veuillez nous contacter directement.",
    },
  },
  whatsapp: {
    // French puts a space before ":".
    colon: " :",
    greeting: "Bonjour Fruidry ! Je voudrais commander :",
    order: "Commande",
    total: "Total",
    name: "Nom",
    phone: "Téléphone",
    delivery: "Livraison",
    note: "Remarque",
  },
  order: {
    title: "Votre commande",
    loading: "Chargement de votre commande…",
    order: "Commande",
    cancelled: "Cette commande a été annulée",
    received: "Nous avons bien reçu votre commande",
    placed: "Passée le",
    total: "Total",
    nextSteps:
      "Nous vous répondrons sur WhatsApp pour organiser le paiement et la livraison. Dès que votre paiement sera confirmé, votre reçu apparaîtra sur cette page.",
    sendAgain: "Renvoyer la commande sur WhatsApp",
  },
  receipt: {
    paymentConfirmed: "Paiement confirmé",
    thanksDelivered: (name, date) => `Merci, ${name} ! Votre commande a été livrée le ${date}.`,
    thanks: (name) => `Merci, ${name} ! Nous vous appellerons pour organiser la livraison.`,
    brandLine: "Fruits lyophilisés",
    receipt: "Reçu",
    order: "Commande",
    paidOn: "Payé le",
    customer: "Client",
    phone: "Téléphone",
    deliverTo: "Livraison à",
    item: "Article",
    qty: "Qté",
    amount: "Montant",
    totalPaid: "Total payé",
    confirmedBy: "Paiement confirmé par Fruidry",
    transactionId: "N° de transaction",
    print: "Imprimer ou enregistrer en PDF",
  },
  notFound: {
    title: "Page introuvable",
    text: "Cette page s'est desséchée. Essayez plutôt la boutique.",
    goToShop: "Aller à la boutique",
  },
  wait: (minutes) => (minutes <= 1 ? "une minute" : `${minutes} minutes`),
};

const dictionaries = { en, fr };

export function getDictionary(lang) {
  return dictionaries[hasLocale(lang) ? lang : DEFAULT_LOCALE];
}
