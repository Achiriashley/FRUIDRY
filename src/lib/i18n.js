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
  // The search-result name never falls back to English: the product's name is used.
  localized.searchName = product.searchNameFr || localized.name;
  return localized;
}

// The product's name in Google results, link previews and photo descriptions
// ("Mangue lyophilisée"), or its plain name if it has no fuller one.
export function searchName(product) {
  return product.searchName || product.name;
}

// "26 October 2026" / "26 octobre 2026" for a day written "2026-10-26".
// The first of the month is "1er" in French.
export function formatDay(day, lang) {
  const text = new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-GB", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
  return lang === "fr" ? text.replace(/^1 /, "1er ") : text;
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
    siteTitle: "Fruidry | Freeze-dried fruit snacks in Cameroon",
    siteDescription:
      "Crunchy freeze-dried fruit snacks with no added sugar and no preservatives. Based in Douala, we deliver across Cameroon: order on WhatsApp.",
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
  cookieNotice: {
    label: "Cookies",
    message:
      "We only keep what the site needs: a cookie to remember your language, and your cart saved on your device. No ads, no tracking.",
    privacy: "Privacy policy",
    ok: "Got it",
  },
  categories: { mixes: "Mixes", fruits: "Fruits" },
  home: {
    badge: "100% fruit · 0% fuss",
    titleBefore: "Freeze-dried fruit, ",
    titleHighlight: "naturally",
    titleAfter: " delicious.",
    intro:
      "Fruidry brings you ripe fruit, freeze-dried for real flavour and a satisfying crunch, with nothing added. A healthy snack, 100% fruit.",
    eyebrow: "Founded in Cameroon",
    shopNow: "Shop now",
    orderNow: "Order now",
    ourStory: "Our story",
    priceFrom: (price) => `From ${price}`,
    // ({ min, max }): delivery days (DELIVERY_DAYS in shop-config.js).
    orderHint: ({ min, max }) =>
      `Order in a few taps on WhatsApp. From Douala, we deliver across Cameroon in ${min} to ${max} days.`,
    // Under the three cards: where Fruidry is and how it sells.
    local: {
      heading: "Freeze-dried fruit in Douala and across Cameroon",
      text: "Fruidry is based in Bonabéri, Douala. We sell our freeze-dried fruit only online and deliver all over the country, most often to Douala, Yaoundé, Buea, Limbe and Bamenda.",
    },
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
    // The shop page's heading (the menu says "Shop").
    title: "Freeze-dried fruit shop",
    // In Google results and link previews.
    metaTitle: "Shop freeze-dried fruit snacks",
    description:
      "Every Fruidry freeze-dried fruit snack: 100% fruit, no added sugar. Order on WhatsApp, delivered across Cameroon.",
    intro: ({ min, max }) =>
      `Every pouch is just fruit, freeze-dried for crunch, with no added sugar or preservatives. Choose your packs, send your order on WhatsApp and get it anywhere in Cameroon in ${min} to ${max} days, from Douala.`,
    all: "All",
    filterLabel: "Filter by category",
  },
  comingSoon: {
    // On a coming-soon fruit that's already in the mix on sale: "…our <mix>."
    inMixBefore: "Meanwhile, this fruit is already in our ",
    inMixAfter: ".",
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
    notifyDone: (name) => `Thanks! We'll message you on WhatsApp as soon as you can order ${name}.`,
    errors: {
      phone: "Enter a Cameroon mobile number, e.g. 671234567.",
      notComingSoon: "This flavour is already available: you can order it now.",
      rateLimited: (wait) => `Too many tries from your network. Please try again in ${wait}.`,
      failed: "Sorry, we couldn't save your number. Please message us on WhatsApp instead.",
    },
  },
  reviews: {
    heading: "Customer reviews",
    summary: (average, count) =>
      `${average} out of 5 · ${count} ${count === 1 ? "review" : "reviews"}`,
    stars: (rating) => `Rated ${rating} out of 5`,
    none: "No reviews yet. Tried this pack? Tell others what you think.",
    formTitle: "Leave a review",
    rating: "Your rating",
    star: (n) => (n === 1 ? "1 star" : `${n} stars`),
    name: "Your first name",
    nameHint: "e.g. Marie N.",
    comment: "Your review",
    commentHint: "What did you like? How do you enjoy it?",
    send: "Send my review",
    sending: "Sending…",
    consent:
      "Your first name, rating and review are shown on this page once we've checked them. See our",
    done: "Thank you! Your review will appear here once we've checked it.",
    errors: {
      rating: "Choose a number of stars.",
      name: "Enter your first name.",
      comment: "Write a few words about the product.",
      tooLong: (max) => `Keep it under ${max} characters.`,
      rateLimited: (wait) => `Too many reviews from this connection. Try again in ${wait}.`,
      notForSale: "Reviews open once this flavour is available.",
      failed: "Sorry, your review couldn't be sent. Please try again later.",
    },
  },
  product: {
    notFound: "Product not found",
    backToShop: "← Back to shop",
    itemCode: "Item code",
    // End of the product's description in Google results.
    metaPrice: (priceAndWeight) => `${priceAndWeight}, delivered across Cameroon.`,
    // Under the highlights of a product on sale. Texts can use ({ min, max }) delivery days.
    deliveryHeading: "Delivery and returns",
    deliveryInfo: [
      {
        icon: "🚚",
        text: ({ min, max }) =>
          `Delivery anywhere in Cameroon from Douala, in ${min} to ${max} days depending on the distance.`,
      },
      {
        icon: "💬",
        text: "The delivery fee depends on your address: we confirm it with you on WhatsApp.",
      },
      {
        icon: "📦",
        text: "Sealed aluminium pouch with a zip: keeps for months while it stays closed.",
      },
      {
        icon: "↩️",
        text: "Returns only if a pack arrives damaged or isn't the one you ordered: we replace or refund it.",
      },
    ],
    related: "You might also like",
    soldOut: "Sold out",
    decrease: "Decrease quantity",
    increase: "Increase quantity",
    added: "Added ✓",
    addedStatus: "Added to cart",
    addToCart: "Add to cart",
    buyNow: "Buy now",
  },
  // The questions page (/guide): what people search about freeze-dried fruit in
  // Cameroon. Answers with ({ name, price, weight }) use the product on sale.
  guide: {
    navLabel: "Questions",
    // Links to the guide from inside pages: says what's in it.
    linkLabel: "Price, delivery, storage: your questions",
    metaTitle: "Freeze-dried fruit in Cameroon: price and tips",
    description: ({ price }) =>
      "Everything about freeze-dried fruit in Cameroon: how it differs from dried fruit, " +
      (price ? `price (${price}), ` : "price, ") +
      "storage, and delivery in 2 to 5 days from Douala.",
    title: "Freeze-dried fruit in Cameroon: your questions",
    intro:
      "Fruidry sells freeze-dried fruit from Douala and delivers across Cameroon. Here are the answers to the questions we're asked most often.",
    moreQuestions: "Got another question? Ask us on WhatsApp.",
    questions: [
      {
        q: "What is freeze-dried fruit?",
        a: [
          "It's fresh fruit, picked ripe, that is frozen and then dried under vacuum: the ice turns straight into vapour, with no high heat. The fruit keeps its taste, colour and nutrients, and becomes light and crunchy.",
        ],
        link: { path: "/about", label: "How freeze-drying works" },
      },
      {
        q: "How is it different from ordinary dried fruit?",
        a: [
          "Ordinary dried (dehydrated) fruit is dried with heat, in the sun or an oven, which makes it chewy and darker. Freeze-drying dries fruit cold, under vacuum: it stays crunchy and keeps its colour and taste.",
        ],
      },
      {
        q: "How much does Fruidry freeze-dried fruit cost?",
        a: [
          ({ name, price, weight }) =>
            name ? `Our ${name} costs ${price} (${weight}).` : "Our prices are shown in the shop.",
          "The delivery fee depends on your address: we confirm it with you on WhatsApp.",
        ],
        // ({ slug, fullName }): the product whose price is quoted.
        link: {
          path: ({ slug }) => (slug ? `/shop/${slug}` : "/shop"),
          label: ({ fullName }) => (fullName ? `Order: ${fullName}` : "See the shop"),
        },
      },
      {
        q: "Where can I buy freeze-dried fruit in Douala and across Cameroon?",
        a: [
          "Fruidry is based in Bonabéri, Douala. For now, our fruit is sold only in our online shop: choose your packs, then send your order on WhatsApp in one tap. We deliver in Douala and across Cameroon.",
        ],
        link: { path: "/shop", label: "Buy online" },
      },
      {
        q: "Do you deliver to my town, and how long does it take?",
        a: [
          "Yes, we deliver across Cameroon, most often to Douala, Yaoundé, Buea, Limbe and Bamenda. Delivery takes 2 to 5 days depending on the distance.",
        ],
      },
      {
        q: "How do I order and pay?",
        a: [
          "Choose your packs in the shop, then send your order on WhatsApp in one tap: the message is already filled in. We reply on WhatsApp to confirm the delivery fee and payment by MTN Mobile Money (MoMo).",
        ],
      },
      {
        q: "Can I return a pack?",
        a: [
          "Only if a pack arrives damaged or isn't the one you ordered: message us on WhatsApp and we'll replace or refund it.",
        ],
      },
      {
        q: "How long does freeze-dried fruit keep?",
        a: [
          "For months, as long as the pack stays properly sealed. Our fruit is packed in sealed, moisture-resistant aluminium pouches.",
        ],
      },
      {
        q: "How do I keep an opened pack?",
        a: [
          "Every pouch has a zip seal: close it well after each use and keep it somewhere dry. Left open or exposed to moisture, the fruit loses its crunch.",
        ],
      },
      {
        q: "How do I eat freeze-dried fruit?",
        a: [
          "As a snack, straight from the pack, or with yoghurt, granola or in a parfait. You can also rehydrate it in water: it gets its original taste back.",
        ],
      },
      {
        q: "Is it a healthy snack? Is there added sugar?",
        a: [
          "Our freeze-dried fruit is 100% fruit: no added sugar, no preservatives, never fried. A crunchy snack, straight from the pack or with yoghurt, granola or in a parfait.",
        ],
      },
      {
        q: "Where does your fruit come from?",
        a: [
          "For now, our fruit is freeze-dried by a partner producer in China and imported to Cameroon by us. Our goal is to freeze-dry fruit grown in Cameroon, right here at home, as soon as we have our own freeze-drying machine.",
        ],
      },
    ],
    flavours: {
      q: "Which flavours do you have?",
      available: "Available now:",
      soon: "Coming soon:",
    },
  },
  about: {
    title: "Our story",
    // In Google results and link previews (the page heading stays "Our story").
    metaTitle: "Our story and how freeze-drying works",
    description:
      "Fruidry was founded in Cameroon. Where our fruit comes from, and how freeze-drying keeps its taste, nutrients and crunch with no added sugar.",
    paragraphs: [
      "Fruidry was founded in Cameroon with a simple idea: make healthy, tasty fruit snacks easy to enjoy every day. No added sugar, no preservatives, just fruit.",
      "We're based in Bonabéri, Douala. We sell only online: you choose your packs on our website, the order goes out on WhatsApp, and we deliver anywhere in Cameroon.",
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
    // In Google results and link previews (the page heading is below).
    title: "Contact us in Douala: WhatsApp and phone",
    description:
      "Questions about an order, wholesale or our freeze-dried fruit? Chat with us on WhatsApp or call us. Based in Douala, we deliver across Cameroon.",
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
    readyAfter: " there to place it, and we'll reply to arrange payment and delivery.",
    openAgain: "Open WhatsApp again",
    viewOrder: "View your order",
    receiptHint: "(your receipt appears there once we confirm payment)",
    notOpened: "WhatsApp didn't open?",
    sendToBefore: "Copy your order and send it to us on WhatsApp at ",
    sendToAfter: ".",
    copyOrder: "Copy my order",
    copied: "Copied! Paste it into a WhatsApp message to us.",
    copyByHand: "Select the text below and copy it:",
    weHaveIt: (reference, phone) =>
      `We've received order ${reference}. If you can't send it, don't worry: we'll contact you on ${phone}.`,
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
      "We'll reply on WhatsApp to arrange payment and delivery. Once your payment is confirmed, your receipt will appear on this page.",
    sendAgain: "Send the order on WhatsApp again",
  },
  receipt: {
    paymentConfirmed: "Payment confirmed",
    thanksDelivered: (name, date) => `Thank you, ${name}! Your order was delivered on ${date}.`,
    thanks: (name) => `Thank you, ${name}! We'll call you to arrange delivery.`,
    reviewPrompt: "Enjoyed it? Tell other customers what you think:",
    reviewLink: (name) => `Review ${name} →`,
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
  // Invoices and proformas made in the admin panel (/invoice/... page).
  invoice: {
    pageTitle: "Invoice",
    tagline: "Freeze-dried fruit · 100% fruit",
    invoice: "Invoice",
    proforma: "Proforma invoice",
    number: "No.",
    issued: "Date",
    dueDate: "Due date",
    validUntil: "Valid until",
    billTo: "Billed to",
    attention: "Attn:",
    phone: "Phone",
    email: "Email",
    niu: "NIU",
    rccm: "RCCM",
    description: "Description",
    qty: "Qty",
    unitPrice: "Unit price",
    amount: "Amount",
    subtotal: "Subtotal",
    discount: "Discount",
    totalExclVat: "Total excl. VAT",
    vat: (rate) => `VAT ${rate}`,
    total: "Total",
    totalInclVat: "Total incl. VAT",
    paid: "Paid",
    amountDue: "Amount due",
    inWords: (words) => `Amount in words: ${words} CFA francs.`,
    payWithMomo: "Pay with MTN Mobile Money by dialling",
    otherPayment: "Other ways to pay",
    notes: "Notes",
    fromOrder: (reference) => `Website order ${reference}`,
    stampPaid: "Paid",
    stampCancelled: "Cancelled",
    cancelledNote: "This document was cancelled. Contact us if you have any questions.",
    proformaNote:
      "This proforma is a quote, valid until the date above. It isn't a request for payment.",
    thanks: "Thank you for your business.",
    print: "Print or save as PDF",
  },
  privacy: {
    title: "Privacy policy",
    description: "What information Fruidry collects, why, and how you stay in control of it.",
    updated: "Last updated: 26 October 2026",
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
        heading: "If you leave a review",
        paragraphs: [
          "If you review a product, we keep your first name, your rating, what you wrote, your language and the date. Once we've checked it, your first name, rating, review and the date are shown publicly on the product's page, and search engines such as Google can show the rating. You can ask us to remove your review at any time.",
        ],
      },
      {
        heading: "If you buy from us as a business",
        paragraphs: [
          "When we make an invoice or a proforma for you, we keep the business name, contact person, phone number, email, address and taxpayer number (NIU) you give us, what you bought and what you've paid. We use them only for your invoices and their payment, and to send them to you on WhatsApp. We may also keep your details as a client so we don't have to ask again, with any note we write about you as a client: you can ask us to remove them at any time. The invoices themselves are kept as long as accounting rules require.",
        ],
      },
      {
        heading: "Where your information is kept",
        paragraphs: [
          "Orders, invoices, reviews and waiting-list numbers are stored in our database (Supabase), and the website is hosted by Vercel. Their servers may be outside Cameroon. Only we can see your orders, in our private admin panel.",
          "So that nothing is lost if the database has a problem, we also keep a private backup copy of this information on our own phone and in our private cloud storage. We keep only the latest copies and delete older ones.",
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
          "After ordering, you get a private link to your order and receipt. Anyone who has this link can see your order, so only share it with people you trust. The same goes for the private link of an invoice we send you.",
        ],
      },
      {
        heading: "Cookies and visit statistics",
        intro: "We don't use advertising or tracking cookies. Here is everything the site stores:",
        items: [
          "A cookie that remembers whether you chose French or English (only if you switch language).",
          "Your cart, saved in the browser on your own device so it's still there when you come back. It isn't sent to us until you order.",
          "Whether you've closed the note about cookies at the bottom of the page, also saved on your own device.",
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
    siteTitle: "Fruidry | Snacks de fruits lyophilisés au Cameroun",
    siteDescription:
      "Des snacks de fruits lyophilisés croquants, sans sucre ajouté ni conservateurs. Basés à Douala, nous livrons partout au Cameroun : commandez sur WhatsApp.",
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
  cookieNotice: {
    label: "Cookies",
    message:
      "Nous ne gardons que l'essentiel : un cookie pour retenir votre langue, et votre panier enregistré sur votre appareil. Ni publicité, ni suivi.",
    privacy: "Politique de confidentialité",
    ok: "J'ai compris",
  },
  categories: { mixes: "Mélanges", fruits: "Fruits" },
  home: {
    badge: "100 % fruit · rien d'autre",
    titleBefore: "Des fruits lyophilisés, ",
    titleHighlight: "naturellement",
    titleAfter: " délicieux.",
    intro:
      "Fruidry vous apporte des fruits mûrs, lyophilisés pour leur vraie saveur et un croquant irrésistible, sans rien d'ajouté. Un snack sain, 100 % fruit.",
    eyebrow: "Fondé au Cameroun",
    shopNow: "Acheter",
    orderNow: "Commander",
    ourStory: "Notre histoire",
    priceFrom: (price) => `À partir de ${price}`,
    orderHint: ({ min, max }) =>
      `Commandez en quelques clics sur WhatsApp. Depuis Douala, nous livrons partout au Cameroun en ${min} à ${max} jours.`,
    local: {
      heading: "Fruits lyophilisés à Douala et partout au Cameroun",
      text: "Fruidry est basé à Bonabéri, à Douala. Nous vendons nos fruits lyophilisés uniquement en ligne et livrons dans tout le pays, le plus souvent à Douala, Yaoundé, Buea, Limbé et Bamenda.",
    },
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
    title: "Boutique de fruits lyophilisés",
    metaTitle: "Boutique de fruits lyophilisés",
    description:
      "Tous les snacks de fruits lyophilisés Fruidry : 100 % fruit, sans sucre ajouté. Commandez sur WhatsApp, livraison partout au Cameroun.",
    intro: ({ min, max }) =>
      `Chaque sachet, c'est juste du fruit, lyophilisé pour le croquant, sans sucre ajouté ni conservateurs. Choisissez vos sachets, envoyez votre commande sur WhatsApp et recevez-la partout au Cameroun en ${min} à ${max} jours, depuis Douala.`,
    all: "Tout",
    filterLabel: "Filtrer par catégorie",
  },
  comingSoon: {
    inMixBefore: "En attendant, ce fruit fait déjà partie de notre ",
    inMixAfter: ".",
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
      `Merci ! Nous vous écrirons sur WhatsApp dès que la saveur « ${name} » sera disponible.`,
    errors: {
      phone: "Entrez un numéro mobile camerounais, par ex. 671234567.",
      notComingSoon: "Cette saveur est déjà disponible : vous pouvez la commander dès maintenant.",
      rateLimited: (wait) =>
        `Trop de tentatives depuis votre réseau. Veuillez réessayer dans ${wait}.`,
      failed:
        "Désolé, nous n'avons pas pu enregistrer votre numéro. Écrivez-nous plutôt sur WhatsApp.",
    },
  },
  reviews: {
    heading: "Avis clients",
    summary: (average, count) => `${average} sur 5 · ${count} avis`,
    stars: (rating) => `Noté ${rating} sur 5`,
    none: "Pas encore d'avis. Vous avez goûté ce sachet ? Dites-nous ce que vous en pensez.",
    formTitle: "Donner votre avis",
    rating: "Votre note",
    star: (n) => (n === 1 ? "1 étoile" : `${n} étoiles`),
    name: "Votre prénom",
    nameHint: "ex. Marie N.",
    comment: "Votre avis",
    commentHint: "Qu'avez-vous aimé ? Comment le dégustez-vous ?",
    send: "Envoyer mon avis",
    sending: "Envoi…",
    consent:
      "Votre prénom, votre note et votre avis seront affichés sur cette page après vérification. Voir notre",
    done: "Merci ! Votre avis apparaîtra ici après vérification.",
    errors: {
      rating: "Choisissez une note.",
      name: "Indiquez votre prénom.",
      comment: "Écrivez quelques mots sur le produit.",
      tooLong: (max) => `${max} caractères maximum.`,
      rateLimited: (wait) => `Trop d'avis envoyés depuis cette connexion. Réessayez dans ${wait}.`,
      notForSale: "Les avis seront ouverts quand cette saveur sera disponible.",
      failed: "Désolé, votre avis n'a pas pu être envoyé. Réessayez plus tard.",
    },
  },
  product: {
    notFound: "Produit introuvable",
    backToShop: "← Retour à la boutique",
    itemCode: "Code article",
    metaPrice: (priceAndWeight) => `${priceAndWeight}, livraison partout au Cameroun.`,
    deliveryHeading: "Livraison et retours",
    deliveryInfo: [
      {
        icon: "🚚",
        text: ({ min, max }) =>
          `Livraison partout au Cameroun depuis Douala, en ${min} à ${max} jours selon la distance.`,
      },
      {
        icon: "💬",
        text: "Les frais de livraison dépendent de votre adresse : nous vous les confirmons sur WhatsApp.",
      },
      {
        icon: "📦",
        text: "Sachet en aluminium scellé, refermable par zip : se conserve plusieurs mois tant qu'il reste fermé.",
      },
      {
        icon: "↩️",
        text: "Retour seulement si un sachet arrive abîmé ou si ce n'est pas celui commandé : nous le remplaçons ou vous remboursons.",
      },
    ],
    related: "Vous aimerez aussi",
    soldOut: "Épuisé",
    decrease: "Diminuer la quantité",
    increase: "Augmenter la quantité",
    added: "Ajouté ✓",
    addedStatus: "Ajouté au panier",
    addToCart: "Ajouter au panier",
    buyNow: "Acheter maintenant",
  },
  guide: {
    navLabel: "Questions fréquentes",
    linkLabel: "Prix, livraison, conservation : vos questions",
    metaTitle: "Fruits lyophilisés au Cameroun : prix et conseils",
    description: ({ price }) =>
      "Tout savoir sur les fruits lyophilisés : différence avec les fruits séchés, " +
      (price ? `prix (${price}), ` : "prix, ") +
      "conservation et livraison partout au Cameroun en 2 à 5 jours.",
    title: "Fruits lyophilisés au Cameroun : vos questions",
    intro:
      "Fruidry vend des fruits lyophilisés depuis Douala et livre partout au Cameroun. Voici les réponses aux questions qu'on nous pose le plus souvent.",
    moreQuestions: "Une autre question ? Posez-la-nous sur WhatsApp.",
    questions: [
      {
        q: "Qu'est-ce qu'un fruit lyophilisé ?",
        a: [
          "C'est un fruit frais, cueilli à maturité, que l'on congèle puis que l'on sèche sous vide : la glace passe directement à l'état de vapeur, sans forte chaleur. Le fruit garde son goût, sa couleur et ses nutriments, et devient léger et croquant.",
        ],
        link: { path: "/about", label: "Comment fonctionne la lyophilisation" },
      },
      {
        q: "Quelle différence avec les fruits secs ou déshydratés ?",
        a: [
          "Les fruits secs ou déshydratés classiques sont séchés à la chaleur, au soleil ou au four : ils deviennent moelleux et plus foncés. La lyophilisation, elle, sèche les fruits à froid et sous vide : ils restent croquants et gardent leur couleur et leur goût.",
        ],
      },
      {
        q: "Combien coûtent les fruits lyophilisés Fruidry ?",
        a: [
          ({ name, price, weight }) =>
            name
              ? `Notre ${name} coûte ${price} le sachet de ${weight}.`
              : "Nos prix sont indiqués dans la boutique.",
          "Les frais de livraison dépendent de votre adresse : nous vous les confirmons sur WhatsApp.",
        ],
        link: {
          path: ({ slug }) => (slug ? `/shop/${slug}` : "/shop"),
          label: ({ fullName }) => (fullName ? `Commander : ${fullName}` : "Voir la boutique"),
        },
      },
      {
        q: "Où acheter des fruits lyophilisés à Douala et au Cameroun ?",
        a: [
          "Fruidry est basé à Bonabéri, à Douala. Pour l'instant, nos fruits sont vendus uniquement sur notre boutique en ligne : choisissez vos sachets, puis envoyez votre commande sur WhatsApp en un clic. Nous livrons à Douala et partout au Cameroun.",
        ],
        link: { path: "/shop", label: "Acheter en ligne" },
      },
      {
        q: "Livrez-vous dans ma ville, et en combien de temps ?",
        a: [
          "Oui, nous livrons partout au Cameroun, le plus souvent à Douala, Yaoundé, Buea, Limbé et Bamenda. La livraison prend 2 à 5 jours selon la distance.",
        ],
      },
      {
        q: "Comment commander et payer ?",
        a: [
          "Choisissez vos sachets dans la boutique, puis envoyez votre commande sur WhatsApp en un clic : le message est déjà rempli. Nous vous répondons sur WhatsApp pour confirmer les frais de livraison et le paiement par MTN Mobile Money (MoMo).",
        ],
      },
      {
        q: "Puis-je retourner un sachet ?",
        a: [
          "Seulement si un sachet arrive abîmé ou si ce n'est pas celui que vous avez commandé : écrivez-nous sur WhatsApp, nous le remplaçons ou vous remboursons.",
        ],
      },
      {
        q: "Combien de temps se conservent les fruits lyophilisés ?",
        a: [
          "Plusieurs mois, tant que le sachet reste bien fermé. Nos fruits sont emballés dans des sachets en aluminium scellés, qui résistent à l'humidité.",
        ],
      },
      {
        q: "Comment conserver un sachet ouvert ?",
        a: [
          "Chaque sachet a une fermeture zip : refermez-le bien après chaque utilisation et gardez-le au sec. À l'air libre ou à l'humidité, les fruits perdent leur croquant.",
        ],
      },
      {
        q: "Comment manger des fruits lyophilisés ?",
        a: [
          "Comme un snack, directement dans le sachet, ou avec un yaourt, du granola ou dans un parfait. Vous pouvez aussi les réhydrater dans de l'eau : ils retrouvent leur goût d'origine.",
        ],
      },
      {
        q: "Est-ce un snack sain ? Y a-t-il du sucre ajouté ?",
        a: [
          "Nos fruits lyophilisés sont 100 % fruit : sans sucre ajouté, sans conservateurs et jamais frits. Un snack croquant, à manger directement dans le sachet ou avec un yaourt, du granola ou dans un parfait.",
        ],
      },
      {
        q: "D'où viennent vos fruits ?",
        a: [
          "Pour l'instant, nos fruits sont lyophilisés par un producteur partenaire en Chine, puis importés au Cameroun par nos soins. Notre objectif : lyophiliser des fruits cultivés au Cameroun, ici même, dès que nous aurons notre propre machine de lyophilisation.",
        ],
      },
    ],
    flavours: {
      q: "Quelles saveurs proposez-vous ?",
      available: "Disponible maintenant :",
      soon: "Bientôt disponible :",
    },
  },
  about: {
    title: "Notre histoire",
    metaTitle: "Notre histoire et la lyophilisation des fruits",
    description:
      "Fruidry est né au Cameroun. D'où viennent nos fruits, et comment la lyophilisation préserve leur goût, leurs nutriments et leur croquant, sans sucre ajouté.",
    paragraphs: [
      "Fruidry a été fondé au Cameroun avec une idée simple : proposer des snacks aux fruits, sains et savoureux, à déguster au quotidien. Sans sucre ajouté, sans conservateurs, juste du fruit.",
      "Nous sommes basés à Bonabéri, à Douala. Nous vendons uniquement en ligne : vous choisissez vos sachets sur notre site, la commande part sur WhatsApp, et nous livrons partout au Cameroun.",
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
    title: "Nous contacter à Douala : WhatsApp et téléphone",
    description:
      "Une question sur une commande, la vente en gros ou nos fruits lyophilisés ? Écrivez-nous sur WhatsApp. Basés à Douala, nous livrons partout au Cameroun.",
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
    readyAfter:
      " pour la passer, et nous vous répondrons pour organiser le paiement et la livraison.",
    openAgain: "Rouvrir WhatsApp",
    viewOrder: "Voir votre commande",
    receiptHint: "(votre reçu y apparaîtra dès que nous aurons confirmé le paiement)",
    notOpened: "WhatsApp ne s'est pas ouvert ?",
    sendToBefore: "Copiez votre commande et envoyez-la-nous sur WhatsApp au ",
    sendToAfter: ".",
    copyOrder: "Copier ma commande",
    copied: "Copiée ! Collez-la dans un message WhatsApp à notre numéro.",
    copyByHand: "Sélectionnez le texte ci-dessous et copiez-le :",
    weHaveIt: (reference, phone) =>
      `Nous avons bien reçu la commande ${reference}. Si vous n'arrivez pas à l'envoyer, pas d'inquiétude : nous vous contacterons au ${phone}.`,
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
      "Nous vous répondrons sur WhatsApp pour organiser le paiement et la livraison. Dès que votre paiement sera confirmé, votre reçu apparaîtra sur cette page.",
    sendAgain: "Renvoyer la commande sur WhatsApp",
  },
  receipt: {
    paymentConfirmed: "Paiement confirmé",
    thanksDelivered: (name, date) => `Merci, ${name} ! Votre commande a été livrée le ${date}.`,
    thanks: (name) => `Merci, ${name} ! Nous vous appellerons pour organiser la livraison.`,
    reviewPrompt: "Vous avez aimé ? Donnez votre avis aux autres clients :",
    reviewLink: (name) => `Donner mon avis : ${name} →`,
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
  invoice: {
    pageTitle: "Facture",
    tagline: "Fruits lyophilisés · 100 % fruit",
    invoice: "Facture",
    proforma: "Facture proforma",
    number: "N°",
    issued: "Date",
    dueDate: "Échéance",
    validUntil: "Valable jusqu'au",
    billTo: "Facturé à",
    attention: "À l'attention de",
    phone: "Téléphone",
    email: "E-mail",
    niu: "NIU",
    rccm: "RCCM",
    description: "Désignation",
    qty: "Qté",
    unitPrice: "Prix unitaire",
    amount: "Montant",
    subtotal: "Sous-total",
    discount: "Remise",
    totalExclVat: "Total HT",
    vat: (rate) => `TVA ${rate}`,
    total: "Total",
    totalInclVat: "Total TTC",
    paid: "Déjà payé",
    amountDue: "Reste à payer",
    inWords: (words, proforma) =>
      `Arrêtée la présente ${proforma ? "facture proforma" : "facture"} à la somme de ${words} francs CFA.`,
    payWithMomo: "Payez par MTN Mobile Money en composant",
    otherPayment: "Autres moyens de paiement",
    notes: "Remarques",
    fromOrder: (reference) => `Commande en ligne ${reference}`,
    stampPaid: "Payée",
    stampCancelled: "Annulée",
    cancelledNote: "Ce document a été annulé. Contactez-nous si vous avez des questions.",
    proformaNote:
      "Cette facture proforma est un devis, valable jusqu'à la date indiquée. Elle ne vaut pas demande de paiement.",
    thanks: "Merci pour votre confiance.",
    print: "Imprimer ou enregistrer en PDF",
  },
  privacy: {
    title: "Politique de confidentialité",
    description:
      "Quelles informations Fruidry collecte, pourquoi, et comment vous gardez le contrôle.",
    updated: "Dernière mise à jour : 26 octobre 2026",
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
        heading: "Si vous donnez votre avis",
        paragraphs: [
          "Si vous donnez votre avis sur un produit, nous conservons votre prénom, votre note, ce que vous avez écrit, votre langue et la date. Après vérification, votre prénom, votre note, votre avis et la date sont affichés publiquement sur la page du produit, et les moteurs de recherche comme Google peuvent afficher la note. Vous pouvez nous demander de retirer votre avis à tout moment.",
        ],
      },
      {
        heading: "Si vous achetez pour une entreprise",
        paragraphs: [
          "Quand nous établissons une facture ou une facture proforma à votre nom, nous conservons le nom de l'entreprise, la personne à contacter, le téléphone, l'e-mail, l'adresse et le numéro de contribuable (NIU) que vous nous donnez, ce que vous avez acheté et ce que vous avez payé. Nous les utilisons uniquement pour vos factures et leur paiement, et pour vous les envoyer sur WhatsApp. Nous pouvons aussi garder vos coordonnées de client pour ne pas vous les redemander, ainsi que les remarques que nous notons sur vous en tant que client : vous pouvez nous demander de les supprimer à tout moment. Les factures elles-mêmes sont conservées aussi longtemps que les règles comptables l'exigent.",
        ],
      },
      {
        heading: "Où sont conservées vos informations",
        paragraphs: [
          "Les commandes, les factures, les avis et les numéros de la liste d'attente sont enregistrés dans notre base de données (Supabase), et le site est hébergé par Vercel. Leurs serveurs peuvent se trouver hors du Cameroun. Nous seuls pouvons voir vos commandes, dans notre espace d'administration privé.",
          "Pour ne rien perdre en cas de problème avec la base de données, nous en gardons aussi une copie de sauvegarde privée sur notre propre téléphone et dans notre stockage en ligne privé. Nous ne gardons que les copies les plus récentes et supprimons les anciennes.",
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
          "Après votre commande, vous recevez un lien privé vers votre commande et votre reçu. Toute personne qui possède ce lien peut voir votre commande : ne le partagez qu'avec des personnes de confiance. Il en va de même pour le lien privé d'une facture que nous vous envoyons.",
        ],
      },
      {
        heading: "Cookies et statistiques de visite",
        intro:
          "Nous n'utilisons pas de cookies publicitaires ni de suivi. Voici tout ce que le site enregistre :",
        items: [
          "Un cookie qui retient si vous avez choisi le français ou l'anglais (seulement si vous changez de langue).",
          "Votre panier, enregistré dans le navigateur de votre propre appareil pour le retrouver à votre retour. Il ne nous est envoyé que lorsque vous commandez.",
          "Si vous avez fermé le message sur les cookies en bas de la page, enregistré lui aussi sur votre propre appareil.",
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
