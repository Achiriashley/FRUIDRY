# Fruidry

The storefront for Fruidry, a brand of freeze-dried fruit snacks. It is built with
[Next.js](https://nextjs.org) (App Router), React (JavaScript/JSX) and Tailwind CSS.

## Features

- **Home page** with a hero section, brand values and featured products
- **Shop** (`/shop`) showing every product, filterable by category
- **Product pages** (`/shop/[slug]`), statically generated, with related products
- **Add to cart** and **Buy now** buttons on every product (Buy now goes straight to checkout)
- **Cart** (`/cart`) that persists in `localStorage`, with quantity controls
- **Checkout on WhatsApp** (`/checkout`): see below
- **Admin panel** (`/admin`): see below
- **Our story** (`/about`) page
- **Contact form** (`/contact`) that validates input in a Server Action

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
- **Product**: change the item code, name, price, pack size, description and highlights, or
  mark the pack as sold out. Changes show on the shop as soon as you save.

Prices are in FCFA (XAF). The starting product details are in `src/lib/products.js`.

### Settings

Copy `.env.example` to `.env.local` and set:

- `WHATSAPP_NUMBER`: your WhatsApp number with the country code, e.g. `2376XXXXXXXX`.
  Customers' orders are sent here.
- `ADMIN_PASSWORD`: the password for `/admin`. Without it the admin page stays locked.
- `SITE_URL` (optional): your site's address, e.g. `https://fruidry.cm`, used in
  receipt links sent on WhatsApp. If it's not set, the address you're browsing on is used.
- `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (optional): store orders and product edits in
  [Supabase](https://supabase.com). Create a free project, run `supabase/schema.sql`
  in its SQL editor, then copy from Project Settings:
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
  app/              Routes (home, shop, product, cart, about, contact)
  components/       Header, footer, product card, cart provider, etc.
  lib/products.js   Product catalogue data and helpers
```

Product details can be edited from the admin panel. The starting details live in `src/lib/products.js`.

## Product photos

Put a photo for each product in `public/products/`, named after the product's
`slug` in `src/lib/products.js`:

```
public/products/mixed-fruit-pack.jpg
```

Supported formats are `.jpg`, `.jpeg`, `.png`, `.webp` and `.avif`. Square images of
about 800×800 px or larger look best, because they are cropped to a square. Products
without a photo show their emoji tile instead.

`npm run dev` picks up new photos when you reload the page. For production, run
`npm run build` again after adding photos.
