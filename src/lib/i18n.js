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
    if (Array.isArray(french) ? french.length > 0 : french) {
      localized[field] = mapTexts(french, frenchSpacing);
    }
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
  colon: ":",
  meta: {
    siteTitle: "Fruidry | Freeze-dried fruit",
    siteDescription:
      "Crunchy freeze-dried fruit snacks with no added sugar and no preservatives. Order on WhatsApp, delivered across Cameroon.",
    ogLocale: "en_GB",
  },
  nav: {
    label: "Main menu",
    shop: "Shop",
    about: "Our story",
    contact: "Contact",
    cart: "Cart",
    home: "Fruidry home",
  },
  language: { switchTo: "Français", switchLabel: "Voir le site en français" },
  footer: {
    tagline: "Freeze-dried fruit snacks with nothing added and nothing hidden.",
    explore: "Explore",
    shopAll: "Shop all",
    promise: "Promise",
    promises: [
      "No added sugar",
      "No preservatives",
      "Freeze-dried, never fried",
      "Delivery across Cameroon",
    ],
    rights: "All rights reserved.",
    privacy: "Privacy policy",
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
    orderHint: "Order in a few taps on WhatsApp. We deliver across Cameroon.",
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
    description:
      "Browse every Fruidry freeze-dried fruit snack. Order on WhatsApp, delivered across Cameroon.",
    intro: "Every pouch is just fruit, freeze-dried for crunch.",
    all: "All",
    filterLabel: "Filter by category",
  },
  comingSoon: {
    badge: "Coming soon",
    heading: "More flavours on the way",
    intro: "New Fruidry flavours, arriving soon.",
    notYet: "This flavour isn't available to order yet. Check back soon!",
    cardCta: "Notify me",
    notifyTitle: "Want to know when it's here?",
    notifyIntro: "Leave your WhatsApp number and we'll send you one message when you can order it.",
    phone: "WhatsApp number",
    phoneHint: "e.g. 6 71 23 45 67",
    notify: "Notify me",
    notifying: "Saving…",
    notifyConsent: "We use your number only to send you that one message, then delete it. See our",
    notifyDone: (name) => `Thanks! We'll message you on WhatsApp when ${name} is available.`,
    errors: {
      phone: "Enter a Cameroon mobile number, e.g. 671234567.",
      notComingSoon: "This flavour is already available: you can order it now.",
      rateLimited: (wait) => `Too many tries from your network. Please try again in ${wait}.`,
      failed: "Sorry, we couldn't save your number. Please message us on WhatsApp instead.",
    },
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
    addedStatus: "Added to cart",
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
    delivery: "We deliver across Cameroon.",
    name: "Name",
    email: "Email",
    optional: "(optional)",
    message: "Message",
    sending: "Preparing your message…",
    send: "Send on WhatsApp",
    consent: "Your message opens in WhatsApp; nothing is stored on our website.",
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
    removeItem: (name) => `Remove ${name} from the cart`,
    decrease: (name) => `Decrease ${name} quantity`,
    increase: (name) => `Increase ${name} quantity`,
    summary: "Order summary",
    total: "Total",
    howItWorks:
      "At checkout your order opens in WhatsApp, and we'll reply to arrange payment and delivery. We deliver across Cameroon.",
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
      "Your order opens in WhatsApp with everything filled in. Just press send, and we'll reply to arrange payment and delivery anywhere in Cameroon.",
    preparing: "Preparing your order…",
    orderOnWhatsApp: "Order on WhatsApp",
    consent: "By ordering, you agree that we use your details to prepare and deliver your order.",
    almostDone: "Almost done!",
    readyBefore: "Your order ",
    readyMiddle: " is ready in WhatsApp. Press ",
    readySend: "send",
    readyAfter: " there to place it, then pay as shown below.",
    readyAfterNoPay: " there to place it, and we'll reply to arrange payment and delivery.",
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
      soldOut: (name) => `Sorry, "${name}" is sold out. Remove it from your cart to continue.`,
      notAvailable: (name) =>
        `Sorry, "${name}" isn't available to order yet. Remove it from your cart to continue.`,
      onlyLeft: (name, left) =>
        `Sorry, only ${left} ${left === 1 ? "pack" : "packs"} of "${name}" ${left === 1 ? "is" : "are"} left. Please lower the quantity in your cart.`,
      rateLimited: (wait) =>
        `You've placed a lot of orders just now. Please try again in ${wait}, or message us on WhatsApp.`,
      notSetUp: "Ordering on WhatsApp isn't set up yet. Please contact us directly.",
    },
  },
  whatsapp: {
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
      "Once we've confirmed your payment, your receipt will appear on this page. We'll arrange delivery with you on WhatsApp.",
    sendAgain: "Send the order on WhatsApp again",
  },
  pay: {
    title: "How to pay",
    intro: (total) => `Pay ${total} with MTN Mobile Money by dialling this code on your phone:`,
    dial: "Dial the code",
    copy: "Copy the code",
    copied: "Copied!",
    delivery: "Any delivery cost will be confirmed with you on WhatsApp.",
    then: "Then send us a screenshot of the payment confirmation message on WhatsApp. We'll confirm your order as soon as we've checked the payment.",
    sendProof: "Send the screenshot on WhatsApp",
    proofMessage: (reference) => `Hello Fruidry! Here is my payment for order ${reference}:`,
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
  privacy: {
    title: "Privacy policy",
    description: "What information Fruidry collects, why, and how you stay in control of it.",
    updated: "Last updated: 16 October 2026",
    sections: [
      {
        heading: "Who we are",
        paragraphs: [
          "Fruidry sells freeze-dried fruit snacks from Bonabéri, Douala, Cameroon. You can reach us on WhatsApp or by phone at {phone}.",
        ],
      },
      {
        heading: "What we collect when you order",
        items: [
          "Your name, phone number and delivery address, and any notes you add.",
          "What you ordered, the total and the language you used.",
          "The date of your order and its status (for example paid or delivered).",
        ],
        paragraphs: [
          "We use this only to prepare your order, contact you about it on WhatsApp or by phone, deliver it and give you your receipt.",
        ],
      },
      {
        heading: "Messages from the contact form",
        paragraphs: [
          "The contact form doesn't store anything on our website. It opens your message in WhatsApp, and you choose whether to send it. WhatsApp (Meta) handles it from there under its own privacy policy.",
        ],
      },
      {
        heading: "If you ask to hear about a new flavour",
        paragraphs: [
          "If you leave your WhatsApp number on a flavour that's coming soon, we keep that number, the flavour and your language. We use them only to send you one WhatsApp message when the flavour is available, then delete them. You can ask us to delete them sooner at any time.",
        ],
      },
      {
        heading: "Where your information is kept",
        paragraphs: [
          "Orders and waiting-list numbers are stored in our database (Supabase), and the website is hosted by Vercel. Their servers may be outside Cameroon. Only we can see your orders, in our private admin panel.",
          "We don't sell your information or share it with anyone else, except the person delivering your order.",
        ],
      },
      {
        heading: "How long we keep it",
        paragraphs: [
          "We keep order details for as long as we need them to deliver your order and keep our sales records. You can ask us to delete them at any time, unless we're required to keep them.",
        ],
      },
      {
        heading: "Your order link",
        paragraphs: [
          "After ordering, you get a private link to your order and receipt. Anyone who has this link can see your order, so only share it with people you trust.",
        ],
      },
      {
        heading: "Cookies and visit statistics",
        intro: "We don't use advertising or tracking cookies. Here is everything the site stores:",
        items: [
          "A cookie that remembers whether you chose French or English (only if you switch language).",
          "Your cart, saved in the browser on your own device so it's still there when you come back. It isn't sent to us until you order.",
          "Anonymous visit statistics (Vercel Web Analytics), such as which pages are viewed and from which country. They use no cookies and can't identify you.",
          "To protect the site from abuse, a scrambled code of your network address is kept for about a day to limit repeated attempts. Our hosting provider also keeps short-lived technical logs.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "You can ask us to see, correct or delete the personal information we hold about you. Contact us on WhatsApp or by phone and we'll help.",
        ],
      },
    ],
  },
  notFound: {
    title: "Page not found",
    text: "This page has dried up. Try the shop instead.",
    goToShop: "Go to the shop",
  },
  wait: (minutes) => (minutes <= 1 ? "a minute" : `${minutes} minutes`),
};

const fr = {
  // French puts a space before ":".
  colon: " :",
  meta: {
    siteTitle: "Fruidry | Fruits lyophilisés",
    siteDescription:
      "Des snacks de fruits lyophilisés croquants, sans sucre ajouté ni conservateurs. Commandez sur WhatsApp, livraison partout au Cameroun.",
    ogLocale: "fr_FR",
  },
  nav: {
    label: "Menu principal",
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
    promises: [
      "Sans sucre ajouté",
      "Sans conservateurs",
      "Lyophilisé, jamais frit",
      "Livraison partout au Cameroun",
    ],
    rights: "Tous droits réservés.",
    privacy: "Confidentialité",
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
    orderHint: "Commandez en quelques clics sur WhatsApp. Livraison partout au Cameroun.",
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
      "Découvrez tous les snacks de fruits lyophilisés Fruidry. Commandez sur WhatsApp, livraison partout au Cameroun.",
    intro: "Chaque sachet, c'est juste du fruit, lyophilisé pour le croquant.",
    all: "Tout",
    filterLabel: "Filtrer par catégorie",
  },
  comingSoon: {
    badge: "Bientôt disponible",
    heading: "D'autres saveurs arrivent",
    intro: "De nouvelles saveurs Fruidry, bientôt disponibles.",
    notYet: "Cette saveur n'est pas encore disponible à la commande. Revenez bientôt !",
    cardCta: "Me prévenir",
    notifyTitle: "Envie d'être prévenu de son arrivée ?",
    notifyIntro:
      "Laissez votre numéro WhatsApp et nous vous enverrons un seul message dès que vous pourrez la commander.",
    phone: "Numéro WhatsApp",
    phoneHint: "ex. 6 71 23 45 67",
    notify: "Me prévenir",
    notifying: "Enregistrement…",
    notifyConsent:
      "Nous utilisons votre numéro uniquement pour vous envoyer ce message, puis nous le supprimons. Voir notre",
    notifyDone: (name) =>
      `Merci ! Nous vous écrirons sur WhatsApp dès que ${name} sera disponible.`,
    errors: {
      phone: "Entrez un numéro mobile camerounais, par ex. 671234567.",
      notComingSoon: "Cette saveur est déjà disponible : vous pouvez la commander dès maintenant.",
      rateLimited: (wait) =>
        `Trop de tentatives depuis votre réseau. Veuillez réessayer dans ${wait}.`,
      failed:
        "Désolé, nous n'avons pas pu enregistrer votre numéro. Écrivez-nous plutôt sur WhatsApp.",
    },
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
    addedStatus: "Ajouté au panier",
    addToCart: "Ajouter au panier",
    buyNow: "Acheter maintenant",
  },
  about: {
    title: "Notre histoire",
    description:
      "Comment Fruidry est né, d'où viennent nos fruits et comment fonctionne la lyophilisation.",
    paragraphs: [
      "Fruidry a été fondé au Cameroun avec une idée simple : proposer des snacks aux fruits, sains et savoureux, à déguster au quotidien. Sans sucre ajouté, sans conservateurs, juste du fruit.",
      "Pour l'instant, nos fruits sont lyophilisés par un producteur partenaire en Chine, puis importés au Cameroun par nos soins.",
      "Notre objectif : lyophiliser des fruits cultivés au Cameroun, ici même, dès que nous aurons notre propre machine de lyophilisation.",
    ],
    howWeMakeIt: "Comment fonctionne la lyophilisation",
    steps: [
      {
        n: "01",
        title: "Cueillis à maturité",
        text: "Les fruits sont choisis à pleine maturité, quand ils sont les plus sucrés.",
      },
      {
        n: "02",
        title: "Congelés rapidement",
        text: "Ils sont lavés, tranchés puis congelés rapidement pour préserver leur saveur et leur couleur.",
      },
      {
        n: "03",
        title: "Séchés sous vide",
        text: "Le vide transforme la glace directement en vapeur, sans forte chaleur : les fruits gardent leur goût et leurs nutriments, et deviennent légers et croquants.",
      },
      {
        n: "04",
        title: "Scellés hermétiquement",
        text: "Ils sont scellés dans des sachets hermétiques et refermables qui gardent chaque morceau croustillant.",
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
      "Une question sur une commande, la vente en gros ou nos fruits ? Discutez avec nous sur WhatsApp, appelez-nous ou laissez votre message ci-dessous.",
    chatOnWhatsApp: "Discuter sur WhatsApp",
    chatGreeting: "Bonjour Fruidry ! J'ai une question.",
    call: "Appelez-nous",
    followUs: "Suivez-nous",
    location: "Bonabéri, Douala, Cameroun",
    delivery: "Nous livrons partout au Cameroun.",
    name: "Nom",
    email: "E-mail",
    optional: "(facultatif)",
    message: "Message",
    sending: "Préparation de votre message…",
    send: "Envoyer sur WhatsApp",
    consent: "Votre message s'ouvre dans WhatsApp ; rien n'est enregistré sur notre site.",
    almostDone: "Presque fini !",
    ready:
      "Votre message est prêt dans WhatsApp. Appuyez sur envoyer et nous vous répondrons rapidement.",
    openAgain: "Rouvrir WhatsApp",
    newMessage: "Écrire un autre message",
    whatsappGreeting: "Bonjour Fruidry !",
    whatsappFrom: "De la part de",
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
    removeItem: (name) => `Retirer ${name} du panier`,
    decrease: (name) => `Diminuer la quantité de ${name}`,
    increase: (name) => `Augmenter la quantité de ${name}`,
    summary: "Récapitulatif",
    total: "Total",
    howItWorks:
      "Au moment de commander, votre commande s'ouvre dans WhatsApp et nous vous répondons pour organiser le paiement et la livraison. Nous livrons partout au Cameroun.",
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
      "Votre commande s'ouvre dans WhatsApp, déjà remplie. Appuyez simplement sur envoyer, et nous vous répondrons pour organiser le paiement et la livraison, partout au Cameroun.",
    preparing: "Préparation de votre commande…",
    orderOnWhatsApp: "Commander sur WhatsApp",
    consent:
      "En commandant, vous acceptez que nous utilisions vos coordonnées pour préparer et livrer votre commande.",
    almostDone: "Presque fini !",
    readyBefore: "Votre commande ",
    readyMiddle: " est prête dans WhatsApp. Appuyez sur ",
    readySend: "envoyer",
    readyAfter: " pour la passer, puis payez comme indiqué ci-dessous.",
    readyAfterNoPay:
      " pour la passer, et nous vous répondrons pour organiser le paiement et la livraison.",
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
      soldOut: (name) =>
        `Désolé, le produit « ${name} » est épuisé. Retirez-le de votre panier pour continuer.`,
      notAvailable: (name) =>
        `Désolé, le produit « ${name} » n'est pas encore disponible. Retirez-le de votre panier pour continuer.`,
      onlyLeft: (name, left) =>
        `Désolé, il ne reste que ${left} ${left === 1 ? "sachet" : "sachets"} de « ${name} ». Veuillez réduire la quantité dans votre panier.`,
      rateLimited: (wait) =>
        `Vous avez passé beaucoup de commandes à l'instant. Réessayez dans ${wait} ou écrivez-nous sur WhatsApp.`,
      notSetUp:
        "La commande sur WhatsApp n'est pas encore configurée. Veuillez nous contacter directement.",
    },
  },
  whatsapp: {
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
      "Dès que nous aurons confirmé votre paiement, votre reçu apparaîtra sur cette page. Nous organiserons la livraison avec vous sur WhatsApp.",
    sendAgain: "Renvoyer la commande sur WhatsApp",
  },
  pay: {
    title: "Comment payer",
    intro: (total) =>
      `Payez ${total} avec MTN Mobile Money en composant ce code sur votre téléphone :`,
    dial: "Composer le code",
    copy: "Copier le code",
    copied: "Copié !",
    delivery: "Les éventuels frais de livraison vous seront confirmés sur WhatsApp.",
    then: "Ensuite, envoyez-nous une capture d'écran du message de confirmation du paiement sur WhatsApp. Nous confirmerons votre commande dès que nous aurons vérifié le paiement.",
    sendProof: "Envoyer la capture sur WhatsApp",
    proofMessage: (reference) =>
      `Bonjour Fruidry ! Voici mon paiement pour la commande ${reference} :`,
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
  privacy: {
    title: "Politique de confidentialité",
    description:
      "Quelles informations Fruidry collecte, pourquoi, et comment vous gardez le contrôle.",
    updated: "Dernière mise à jour : 16 octobre 2026",
    sections: [
      {
        heading: "Qui sommes-nous",
        paragraphs: [
          "Fruidry vend des snacks de fruits lyophilisés depuis Bonabéri, Douala, au Cameroun. Vous pouvez nous joindre sur WhatsApp ou par téléphone au {phone}.",
        ],
      },
      {
        heading: "Ce que nous collectons quand vous commandez",
        items: [
          "Votre nom, votre numéro de téléphone et votre adresse de livraison, ainsi que les remarques que vous ajoutez.",
          "Ce que vous avez commandé, le total et la langue utilisée.",
          "La date de votre commande et son statut (par exemple payée ou livrée).",
        ],
        paragraphs: [
          "Nous utilisons ces informations uniquement pour préparer votre commande, vous contacter à son sujet sur WhatsApp ou par téléphone, la livrer et vous remettre votre reçu.",
        ],
      },
      {
        heading: "Messages du formulaire de contact",
        paragraphs: [
          "Le formulaire de contact n'enregistre rien sur notre site. Il ouvre votre message dans WhatsApp, et c'est vous qui choisissez de l'envoyer. WhatsApp (Meta) le traite ensuite selon sa propre politique de confidentialité.",
        ],
      },
      {
        heading: "Si vous demandez à être prévenu d'une nouvelle saveur",
        paragraphs: [
          "Si vous laissez votre numéro WhatsApp sur une saveur bientôt disponible, nous conservons ce numéro, la saveur et votre langue. Nous les utilisons uniquement pour vous envoyer un seul message WhatsApp quand la saveur sera disponible, puis nous les supprimons. Vous pouvez nous demander de les supprimer plus tôt à tout moment.",
        ],
      },
      {
        heading: "Où sont conservées vos informations",
        paragraphs: [
          "Les commandes et les numéros de la liste d'attente sont enregistrés dans notre base de données (Supabase), et le site est hébergé par Vercel. Leurs serveurs peuvent se trouver hors du Cameroun. Nous seuls pouvons voir vos commandes, dans notre espace d'administration privé.",
          "Nous ne vendons pas vos informations et ne les partageons avec personne d'autre, sauf avec la personne qui livre votre commande.",
        ],
      },
      {
        heading: "Durée de conservation",
        paragraphs: [
          "Nous conservons les détails des commandes aussi longtemps que nécessaire pour livrer votre commande et tenir nos registres de ventes. Vous pouvez nous demander de les supprimer à tout moment, sauf si nous sommes tenus de les conserver.",
        ],
      },
      {
        heading: "Le lien de votre commande",
        paragraphs: [
          "Après votre commande, vous recevez un lien privé vers votre commande et votre reçu. Toute personne qui possède ce lien peut voir votre commande : ne le partagez qu'avec des personnes de confiance.",
        ],
      },
      {
        heading: "Cookies et statistiques de visite",
        intro:
          "Nous n'utilisons pas de cookies publicitaires ni de suivi. Voici tout ce que le site enregistre :",
        items: [
          "Un cookie qui retient si vous avez choisi le français ou l'anglais (seulement si vous changez de langue).",
          "Votre panier, enregistré dans le navigateur de votre propre appareil pour le retrouver à votre retour. Il ne nous est envoyé que lorsque vous commandez.",
          "Des statistiques de visite anonymes (Vercel Web Analytics), comme les pages consultées et le pays des visiteurs. Elles n'utilisent aucun cookie et ne permettent pas de vous identifier.",
          "Pour protéger le site contre les abus, un code brouillé de votre adresse réseau est conservé environ une journée afin de limiter les tentatives répétées. Notre hébergeur conserve aussi des journaux techniques pendant une courte durée.",
        ],
      },
      {
        heading: "Vos droits",
        paragraphs: [
          "Vous pouvez nous demander de consulter, corriger ou supprimer les informations personnelles que nous détenons sur vous. Contactez-nous sur WhatsApp ou par téléphone et nous vous aiderons.",
        ],
      },
    ],
  },
  notFound: {
    title: "Page introuvable",
    text: "Cette page s'est desséchée. Essayez plutôt la boutique.",
    goToShop: "Aller à la boutique",
  },
  wait: (minutes) => (minutes <= 1 ? "une minute" : `${minutes} minutes`),
};

// French puts a non-breaking space before : ; ! ? and inside « », so the mark
// never ends up alone at the start of a line.
export function frenchSpacing(text) {
  return text
    .replace(/ ([!?;])/g, "\u202f$1")
    .replace(/ :/g, "\u00a0:")
    .replace(/« /g, "«\u00a0")
    .replace(/ »/g, "\u00a0»");
}

// Applies fn to every text in a dictionary, including texts built by functions.
function mapTexts(value, fn) {
  if (typeof value === "string") return fn(value);
  if (typeof value === "function") return (...args) => fn(value(...args));
  if (Array.isArray(value)) return value.map((v) => mapTexts(v, fn));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapTexts(v, fn)]));
  }
  return value;
}

const dictionaries = { en, fr: mapTexts(fr, frenchSpacing) };

export function getDictionary(lang) {
  return dictionaries[hasLocale(lang) ? lang : DEFAULT_LOCALE];
}
