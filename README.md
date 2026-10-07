# Fruidry

The storefront for Fruidry, a brand of freeze-dried fruit snacks. It is built with
[Next.js](https://nextjs.org) (App Router), React (JavaScript/JSX) and Tailwind CSS.

## Features

- **Home page** with a hero section, brand values and featured products
- **Shop** (`/shop`) showing every product, filterable by category
- **Product pages** (`/shop/[slug]`), statically generated, with related products
- **Cart** (`/cart`) that persists in `localStorage`, with quantity controls and a free-shipping threshold. Checkout is a demo and takes no payment.
- **Our story** (`/about`) page
- **Contact form** (`/contact`) that validates input in a Server Action

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

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

To add or edit products, change `src/lib/products.js`.

## Product photos

Put a photo for each product in `public/products/`, named after the product's
`slug` in `src/lib/products.js`:

```
public/products/freeze-dried-mango.jpg
public/products/freeze-dried-strawberries.webp
```

Supported formats are `.jpg`, `.jpeg`, `.png`, `.webp` and `.avif`. Square images of
about 800×800 px or larger look best, because they are cropped to a square. Products
without a photo show their emoji tile instead.

`npm run dev` picks up new photos when you reload the page. For production, run
`npm run build` again after adding photos.
