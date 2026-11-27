# Norde storefront (prototype)

A one-page store for two cool-menthol products (Tonic Rinse in Shampoo and Cool Body Soap),
built around real product photography with a beach theme. Vite, no framework.

Prices and reviews are placeholders.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs dist/
```

## Deploy

Connected to Vercel: every push to `main` redeploys production, and other branches get preview links.

## Where things live

- `index.html`: all page sections
- `src/style.css`: palette (taken from the photos), layout, motion
- `src/main.js`: scroll reveals, parallax, photo tilt, newsletter form
- `src/cart.js`: bag drawer, sizes, the pair bundle, free-delivery meter (saved in the browser)
- `public/img/`: product photos and crops

## Not connected yet

- Checkout/payments (the Checkout button shows a notice). Shopify or Stripe can be wired in next.
- Newsletter sign-up (front end only).
- Real ingredient lists and verified reviews.
