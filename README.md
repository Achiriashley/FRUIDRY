# Fruidry

The storefront for Fruidry, a brand of freeze-dried fruit snacks. It is built with
[Next.js](https://nextjs.org) (App Router), React (JavaScript/JSX) and Tailwind CSS.

## Features

- **French and English**: every shop page exists at `/fr/...` and `/en/...`, with a
  language button in the header (see below)
- **Home page** with a hero section, brand values, featured products and upcoming flavours
- **Shop** (`/shop`) showing every product, filterable by category
- **Product pages** (`/shop/[slug]`), statically generated, with related products
- **Add to cart** and **Buy now** buttons on every product (Buy now goes straight to checkout)
- **Cart** (`/cart`) that persists in `localStorage`, with quantity controls
- **Checkout on WhatsApp** (`/checkout`): see below
- **Admin panel** (`/admin`): see below
- **Our story** (`/about`) page
- **Contact page** (`/contact`) with your phone number, WhatsApp and social accounts
  (set in `src/lib/shop-config.js`), and a form that sends the message to your
  WhatsApp, like orders

## Languages and search engines

The shop is in French and English. Each page has its own address in each language
(`/fr/shop`, `/en/shop`, ...). Visiting an address without a language (like `/` or an
older link such as `/shop`) sends visitors to the language they picked before, or their
phone's language, or French. The admin panel stays in English.

- Page texts live in `src/lib/i18n.js`.
- Product names, taglines, descriptions and highlights have optional French versions,
  edited in the admin panel under **French text**. Empty French fields show the English text.
- Customers' WhatsApp order messages, their order page and receipt, and the messages
  you send them from the admin panel use the language they ordered in.

For search engines and link previews, each page has its own title and description in
its language, links to its translation (`hreflang`), and a preview picture for WhatsApp
and social media. Product pages also tell Google the price, currency and stock (structured
data). `/sitemap.xml` lists every page in both languages and `/robots.txt` keeps the admin,
cart, checkout and order pages out of search results. Set `SITE_URL` once you have your
own domain; on Vercel the production address is used until then.

## Privacy and visitor statistics

- `/fr/privacy` and `/en/privacy` explain what the site collects (order details), why,
  where it's stored (Supabase and Vercel), cookies, and how customers can ask for
  their details to be changed or deleted. The texts are in `src/lib/i18n.js`
  (`privacy`); update the date there when you change them. Checkout and the contact
  form link to it.
- The only cookies are the language choice and, for you, the admin sign-in. The cart
  stays in the visitor's browser. There are no tracking or advertising cookies, so no
  cookie banner is needed.
- **Visitor statistics** use Vercel Web Analytics, which uses no cookies. It only runs on
  Vercel and not on admin pages, and order links are reported as `/order/[id]` so
  they stay private. To turn it on: Vercel → your project → **Analytics** → **Enable**,
  then redeploy.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Orders on WhatsApp

1. The customer fills in their name, phone and delivery address at `/checkout` and taps
   **Order on WhatsApp**.
2. WhatsApp opens with a message to your number, already filled in: the order number
   (e.g. `FD-4NBXKR`), each item's code (e.g. `FD-MIX-50`), quantity and price, the total,
   and their delivery details. They press send.
3. You reply on WhatsApp to arrange payment and delivery.
4. The order is also saved to the admin panel under **New orders**. Once they've paid,
   click **Mark as paid**: their order page (`/order/...`) becomes a printable receipt,
   and you can send them the receipt link on WhatsApp.
5. After delivery, click **Mark as delivered**.

If saving the order fails (for example if Supabase isn't set up), the customer is still
sent to WhatsApp, so no order is lost. The failure is written to the server logs.

Set your WhatsApp number in `WHATSAPP_NUMBER` (see Settings below). Item codes can be
changed on the admin **Product** page.

## Admin panel

Go to `/admin` and sign in with `ADMIN_PASSWORD`. There is no link to it on the
public site, so bookmark it.

- **Dashboard**: new orders, orders to deliver, and sales this month and in total.
- **Orders**: every order, filterable by status and searchable by order number,
  customer name or phone.
- **Products**: add new products (with a photo), edit any product's item code, name,
  price, pack size, description, highlights and photo, mark it sold out or
  **coming soon**, or delete it. Changes show on the shop as soon as you save. Photos
  are shrunk before uploading; PNG photos keep their transparent background.

**Coming soon** products (Mango, Strawberries, Pineapple and Apple to start with) are
shown in a "Coming soon" section with their photo but no price, and can't be ordered.
When one is ready to sell, open it in the admin panel, check its price, untick
**Coming soon** and save: it moves into the shop straight away.

Prices are in FCFA (XAF). The starting product details are in `src/lib/products.js`.

### Settings

Copy `.env.example` to `.env.local` and set:

- `WHATSAPP_NUMBER`: your WhatsApp number with the country code, e.g. `2376XXXXXXXX`.
  Customers' orders are sent here.
- `ADMIN_PASSWORD`: the password for `/admin`. Without it the admin page stays locked.
- `SITE_URL` (optional): your site's address, e.g. `https://fruidry.cm`, used in
  receipt links sent on WhatsApp and in the links search engines see. If it's not set,
  receipt links use the address you're browsing on, and search engines get the Vercel
  production address.
- `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (optional): store orders and product edits in
  [Supabase](https://supabase.com). Create a free project, run `supabase/schema.sql`
  in its SQL editor (it creates the tables, a public `product-images` folder for photos and
  the rate-limit counter used to block password guessing and spam),
  then copy from Project Settings:
  - the **Project URL** into `SUPABASE_URL`
  - a **secret key** (starts with `sb_secret_`, under API Keys), or on older projects
    the legacy **service_role** key, into `SUPABASE_SECRET_KEY`. (The older name
    `SUPABASE_SERVICE_ROLE_KEY` also works.)

  Don't use the **publishable** key (`sb_publishable_...`, formerly "anon"): it can't
  read or write the orders. Keep the secret key private and never put it in code
  that runs in the browser.

If Supabase isn't set, orders and product edits are saved in `data/` on the server. That
works locally and on your own server, but not on Vercel or other hosts whose
filesystem is read-only, so set up Supabase before deploying there.

## Security

- **Admin sign-in**: 5 attempts per 15 minutes per network, then blocked for the rest of
  that window. Sessions are signed, expire after 7 days, and end for everyone when
  `ADMIN_PASSWORD` changes. Use a long, random password (16+ characters).
- **Spam limits**: 10 orders per hour and 5 contact messages per hour per network. Counts
  are kept in Supabase (`rate_limits`) so they hold across servers; without Supabase they
  are kept in memory.
- **Orders**: prices and totals are always recalculated on the server from the product
  list; quantities are limited to 1–50 and sold-out products can't be ordered.
- **Uploads**: admin-only; photos are checked by their actual contents (JPEG, PNG or
  WebP only) and given random names.
- **Headers**: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy and Permissions-Policy on every page, plus HSTS on Vercel
  (`next.config.mjs`).
- **Data**: Supabase tables have row-level security on and no policies, so only the
  server's secret key can read them. Don't add "public read" policies to `orders`.

## Scripts

| Command         | Description                   |
| --------------- | ----------------------------- |
| `npm run dev`   | Start the development server  |
| `npm run build` | Create a production build     |
| `npm start`     | Serve the production build    |
| `npm run lint`  | Run ESLint                    |

## Project structure

```
src/
  app/[lang]/       Shop pages in each language (home, shop, product, cart, about, contact)
  app/admin/        Admin panel
  components/       Header, footer, product card, cart provider, etc.
  lib/i18n.js       French and English texts
  lib/products.js   Product catalogue data and helpers
  proxy.js          Sends addresses without a language to /fr or /en
```

Products are managed from the admin panel. The starting product (Mixed Fruit Pack) is
defined in `src/lib/products.js`; everything you add, change or delete in the panel is
saved on top of that.

## Product photos

The starting products' photos are in `public/products/`, named after each product's
`slug` in `src/lib/products.js` (e.g. `public/products/mixed-fruit-pack.png`). They are
cut-outs of the pack designs with a transparent background, so they sit on the
coloured tiles. A photo uploaded in the admin panel replaces the file for that product.

Supported formats are `.jpg`, `.jpeg`, `.png`, `.webp` and `.avif`. Photos are shown
whole (not cropped), so pack shots and square photos both work. Products without a
photo show their emoji tile instead.

The logo files are in `public/brand/`, and the browser-tab icons are
`src/app/icon.png`, `src/app/apple-icon.png` and `src/app/favicon.ico`. The colours
(taken from the packaging) are set at the top of `src/app/globals.css`.

`npm run dev` picks up new photos when you reload the page. For production, run
`npm run build` again after adding photos.
