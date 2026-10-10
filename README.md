# Fruidry

The storefront for Fruidry, a brand of freeze-dried fruit snacks. It is built with
[Next.js](https://nextjs.org) (App Router), React (JavaScript/JSX) and Tailwind CSS.

## Features

- **Home page** with a hero section, brand values and featured products
- **Shop** (`/shop`) showing every product, filterable by category
- **Product pages** (`/shop/[slug]`), statically generated, with related products
- **Add to cart** and **Buy now** buttons on every product (Buy now goes straight to checkout)
- **Cart** (`/cart`) that persists in `localStorage`, with quantity controls
- **Checkout with MTN Mobile Money** (`/checkout`, `/order/[id]`): see below
- **Admin panel** (`/admin`): see below
- **Our story** (`/about`) page
- **Contact form** (`/contact`) that validates input in a Server Action

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Orders and Mobile Money payments

1. The customer fills in their name, phone and delivery address at `/checkout`.
2. On their order page they tap **Pay now**, which opens the phone dialer with
   `*126*16*747434*<total>#` ready. They press call and enter their Mobile Money PIN.
3. They type the transaction ID from their confirmation SMS on the order page.
4. You open `/admin`, check the transaction ID against your Mobile Money messages,
   and click **Confirm payment** (or **Reject** with a reason).
5. The customer's order page turns into a receipt they can print or save as PDF.
   From `/admin` you can also send them the receipt link on WhatsApp.
6. Once you've delivered the order, click **Mark as delivered**.

## Admin panel

Go to `/admin` and sign in with `ADMIN_PASSWORD`. There is no link to it on the
public site, so bookmark it.

- **Dashboard**: payments to check, orders to deliver, and sales this month and in total.
- **Orders**: every order, filterable by status and searchable by order number,
  customer name, phone or transaction ID.
- **Product**: change the name, price, pack size, description and highlights, or
  mark the pack as sold out. Changes show on the shop as soon as you save.

The USSD code and provider name are in `src/lib/shop-config.js`.
Prices are in FCFA (XAF) in `src/lib/products.js`.

### Settings

Copy `.env.example` to `.env.local` and set:

- `ADMIN_PASSWORD`: the password for `/admin`. Without it the admin page stays locked.
- `SITE_URL` (optional): your site's address, e.g. `https://fruidry.cm`, used in
  receipt links sent on WhatsApp. If it's not set, the address you're browsing on is used.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (optional): store orders and product edits in
  [Supabase](https://supabase.com). Create a free project, run `supabase/schema.sql`
  in its SQL editor, then copy from Project Settings:
  - the **Project URL** into `SUPABASE_URL`
  - a **secret key** (starts with `sb_secret_`, under API Keys), or on older projects
    the legacy **service_role** key, into `SUPABASE_SERVICE_ROLE_KEY`.

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
