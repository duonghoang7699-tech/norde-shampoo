# Norde storefront (prototype)

A one-page shampoo store with a real-time 3D beach scene: the bottle floats over the sea,
then spins down onto a striped towel beside oranges as you scroll. Built with Vite + Three.js.

Brand name, prices and reviews are placeholders until the real product details are confirmed.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs dist/
```

## Deploy on Vercel

Import this repo at https://vercel.com/new. Vercel detects Vite automatically
(build `npm run build`, output `dist`). Every push to `main` redeploys.

## Where things live

- `src/scene.js`: the beach scene (sky, sea, sand, towel, oranges, camera path on scroll)
- `src/bottle.js`, `src/textures.js`: the bottle model and its printed label, plus procedural textures
- `src/foam.js`: the lather section
- `src/cart.js`: bag drawer, sizes, quantities, free-delivery meter (saved in the browser)
- `public/shots/`: still images rendered from the 3D scene (poster, editorial and routine photos)

## Not connected yet

- Checkout/payments (the Checkout button shows a notice). Shopify or Stripe can be wired in next.
- Newsletter sign-up (front end only).
- Real ingredient list and verified reviews.

Sea surface normal map (`public/tex/waternormals.jpg`) is from the three.js examples (MIT).
