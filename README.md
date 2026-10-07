# Fruidry

The storefront for Fruidry, a brand of naturally dried fruit snacks. It is built with
[Next.js](https://nextjs.org) (App Router), React, TypeScript and Tailwind CSS.

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
  lib/products.ts   Product catalogue data and helpers
```

To add or edit products, change `src/lib/products.ts`.
