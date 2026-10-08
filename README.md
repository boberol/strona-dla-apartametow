# StayGuide — digital guest guide for apartments

A subscription product for apartment owners. Each owner gets a mobile-first guest
site, prints one QR code for the apartment, and guests scan it to find Wi-Fi
details, check-in instructions, house rules, local tips and a damage-report form.
Owners pick a template, customise it in a block editor, and pay by subscription.

---

## Getting started

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

| What | Where |
| --- | --- |
| Marketing site + pricing | http://localhost:3000 |
| Sign up | http://localhost:3000/en/signup |
| Demo guest site | http://localhost:3000/s/demo |
| Owner dashboard | http://localhost:3000/en/dashboard |

The seed creates a demo account: **demo@example.com / demo1234**.

### Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm test` | 85 unit tests (document repair, tree mutations, auth, entitlements, reports, admin stats, guide) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run verify:e2e` | 110 end-to-end checks against a running dev server |
| `npm run db:seed` | Reset the demo account and apartment |
| `npm run db:reset` | Drop the database and reseed |
| `npm run admin -- list` / `grant <email>` / `revoke <email>` / `create <email>` | Manage platform admins |

---

## The three surfaces

**1. Marketing site** (`/[locale]`) — what the product is, how it works, pricing
with a monthly/yearly toggle, FAQ. Choosing a plan leads to signup.

**2. Partner panel** (`/[locale]/dashboard`, `/[locale]/onboarding`) — navy with a
green accent, in a light and a dark palette. Onboarding is a template picker with
a live phone preview; the dashboard lists apartments, each with its printable QR
card and its settings (rename, change address, delete); a reports inbox collects
what guests flag; billing takes payments; account settings change the email or
password or delete the account; a five-minute editing guide lives under **Guide**.
Platform admins also get **Admin** (below).

**3. Guest app** (`/s/{slug}/{lang}/...`) — themed by each owner, not by us. The
panel's palettes are scoped to `.panel` so they can never leak into a guest site.

### Light and dark mode

The marketing site and panel follow the operating system by default. The sun/moon
button stores an explicit choice in an `sg_theme` cookie, which the server reads
and renders as `data-theme` on `<html>` — so there is no flash of the wrong
palette and no script before paint. Both palettes are the same `--p-*` tokens in
`globals.css`; components never hard-code a colour.

---

## How it is put together

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 ·
Prisma 7 + SQLite · next-intl · Stripe · Iconify.

```
src/
  site/          data model — schema, repair, mutations, templates, theme, icons
  lib/           db, auth, guard, billing, plans, subscription, storage
  components/
    guest/       what a guest sees
    editor/      the block editor
    panel/       partner-panel chrome, onboarding
    marketing/   pricing table
  app/
    [locale]/    marketing, auth, onboarding, dashboard
    s/[slug]/    guest app
    q/[code]/    permanent QR redirect
    api/
```

### The site document

Each property stores its whole site as one JSON document, in two columns:
`draft` (what the editor writes) and `published` (what guests read). Publishing
copies draft over published and appends a `SiteVersion` snapshot.

Loading a guest page is a single row read — which matters most when someone is
scanning a QR code on weak mobile data. The document is stored as **text, not a
native JSON column**: every read is zod-validated anyway and nothing queries
inside it, so SQLite (local) and Postgres (production) behave identically.

### A malformed document can never break a guest page

`parseSiteDoc()` never throws. It validates fast, and on failure repairs the
document field by field — dropping only the tiles or blocks it cannot rescue,
clamping out-of-range values, de-duplicating slugs and ids, capping nesting
depth. Covered by tests using deliberately corrupt input.

### One renderer, not two

The editor's phone preview is an `<iframe>` of the real guest app in preview
mode, so the preview cannot drift from what a guest sees. The cost is that it
refreshes after each autosave (~700 ms after you stop typing).

`?preview=1` serves the unpublished draft and **requires the owning
organisation's session** — drafts hold door codes and passwords not yet meant to
be live. Anyone else silently gets the published version.

### Authorisation

Every write proves the target property belongs to the caller's organisation
(`src/lib/guard.ts`). Another organisation's property returns **404, not 403**,
so responses cannot be used to probe which ids exist. Verified end to end: a
second account cannot patch, publish, preview or open the editor for someone
else's apartment.

Passwords use scrypt (built into Node, no native dependency) with a per-password
salt and constant-time comparison. Sessions are database rows keyed by a SHA-256
hash of the cookie value, so a leaked database cannot be used to sign in, and a
session can actually be revoked.

### Trial and entitlements

Signing up starts a 14-day trial with no card. When it ends, **editing stops but
published guest sites stay online** — a guest standing in the apartment should
never see a billing problem that is between us and the owner. The API returns
`402` for writes from an expired account, and the editor stops autosaving rather
than showing a failure on every keystroke.

### Adding a block type

Three adjacent places: the zod shape in `src/site/schema.ts`, the guest renderer
in `components/guest/BlockRenderer.tsx`, the editor form in
`components/editor/BlockInspector.tsx`. Split so the editor's form code never
ships in the guest bundle.

### Two things done differently from the product this models

- **Real URLs per tile.** The reference keeps every tile at one address, so there
  are no deep links and the back button leaves the site. Here
  `/s/demo/en/arrival/wifi` is a real, shareable, per-language URL.
- **Zero icon requests.** The reference fetches icons from an API at runtime —
  five extra requests per page load. Here icons are server-rendered to inline
  SVG, so a guest fetches none. Asserted in `verify:e2e`.

### Printed QR codes never break

The QR encodes `/q/{shortCode}`, a permanent per-property code that redirects to
the current site. Renaming the property, changing its slug or moving to a custom
domain never invalidates a card already hung in a hallway.

Each apartment has a printable card (`/[locale]/dashboard/sites/{id}/qr`): the
apartment name, the code, and the prompt in every language the owner publishes,
since the guest in front of it has not picked a language yet. The code is also a
PNG (1200 px) or SVG download from `/api/sites/{id}/qr`, owner-only like every
other property route, and not gated on the subscription — an owner can always
reprint what already hangs in their apartment.

### Guest reports inbox

Reports from the guest "report a problem" form land in `/[locale]/dashboard/inbox`
with the apartment, time, the guest's language (so the owner knows how to reply)
and any photos. The panel shows an unread count in the navigation and on the
apartment. Marking a report resolved is scoped to the owner's organisation like
every other write, and stays available after a trial ends.

---

## Billing

Two ways to pay, both through Stripe Checkout:

- **Subscription (card, renews by itself)**, monthly or yearly.
  `payment_method_collection: "if_required"`, so the advertised "no card" trial
  really asks for no card. The Customer Portal handles plan changes and
  cancellation.
- **A year paid once with BLIK, Przelewy24 or card.** Checkout in `payment`
  mode with an invoice. It sets the account to `prepaid` until a fixed date and
  does not renew; the panel reminds the owner in the last 30 days. It is not
  offered on top of a running subscription.

Choosing a plan never grants a second trial and never loses days: billing starts
when current cover (the rest of the trial or of a prepaid year) runs out —
`coveredUntil()` in `src/lib/subscription.ts`, passed to Stripe as
`trial_end`. `tax_id_collection` is on for business NIPs.

Webhooks are the only path that writes payment state into our database, and the
signature is verified. Every payment lands in a `Payment` row keyed by the
Stripe invoice / checkout-session id, which makes a redelivered webhook harmless
(a prepaid year is granted exactly once) and gives owners a payment history with
invoice links. Plan changes made in the Customer Portal are picked up from the
price id.

### Going live with payments

1. Create a Stripe account and set `STRIPE_SECRET_KEY` (test key first).
2. In the Stripe Dashboard, turn on **BLIK** and **Przelewy24** under payment
   methods, and configure the **Customer Portal** (allow cancel and plan switch).
3. Add a webhook endpoint at `https://your-domain/api/stripe/webhook` with the
   events `customer.subscription.created`, `.updated`, `.deleted`,
   `checkout.session.completed`, `checkout.session.async_payment_succeeded` and
   `invoice.paid`, and set `STRIPE_WEBHOOK_SECRET`. Locally:
   `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
4. Optional: create products and prices and set the `STRIPE_PRICE_*` ids; without
   them checkout builds prices inline from `src/lib/plans.ts`.

**Without `STRIPE_SECRET_KEY` the app runs in simulated mode**: choosing a plan
activates it locally so the whole signup → plan → editor flow is testable before
any Stripe account exists. Adding the keys switches to real checkout with no code
change. The billing page says plainly which mode it is in.

Plans and prices live in one file, `src/lib/plans.ts`.

### Polish market constraints (verified, and they shaped the above)

- **Przelewy24 does not support recurring payments at all**, and is unsupported
  in Stripe's Customer Portal. **Recurring BLIK is Stripe private preview.** So
  cards are the only dependable auto-renewing method here; P24/BLIK suit one-off
  annual invoices.
- **KSeF e-invoicing is mandatory for B2B** in Poland (effectively all firms
  since 1 April 2026; penalties suspended until 31 Dec 2026). Prices are quoted
  *netto* to businesses, so this applies. Do not hand-roll invoicing: let Stripe
  Tax calculate VAT and collect the NIP, and issue the faktura through a
  KSeF-integrated provider (Fakturownia / inFakt) from the `invoice.paid` webhook.
- This is also why billing is **not** in WordPress: WooCommerce would still have
  to tell this app who is subscribed, so it adds a hop and a second source of
  truth for accounts rather than removing work.

---

## Languages

EN / ES / PL throughout — marketing, panel and guest app. UI strings live in
`messages/{en,es,pl}.json` (492 keys, kept in parity). Guest **content** is
owner-authored per language; the owner chooses which languages to publish, and an
empty field falls back to the site's default language so a half-translated site
is never blank.

---

## Email

`src/lib/email.ts` sends through Resend when `RESEND_API_KEY` is set (plain
`fetch`, no SDK). It carries password-reset links (one-time, one hour, only a
hash stored, and using one signs the account out everywhere) and "new guest
report" alerts in each owner's panel language. Without a key, development prints
the email to the server console; production sends nothing and never logs a
reset link.

## Admin

Platform admins (`User.isAdmin`) get `/[locale]/admin`: an overview (accounts,
paying, on trial, estimated monthly revenue, apartments, open reports), a
searchable account list, every payment, and per-account support actions —
extend a trial, grant a free year, end access, send a password-reset link, and
make or remove other admins. Everyone else gets the same 404 as a missing page.
Admin rights never open another organisation's editor. The first admin comes
from the command line: `npm run admin -- grant you@example.com` for an existing
account, or `npm run admin -- create you@example.com` (asks for the password).
Every admin action writes an `[admin]` line to the server log.

## Known gaps

- **Tile reordering is button-driven** (move, nest, unnest), not drag-and-drop.
  Same capability, works with a keyboard, and "nest" is explicit rather than
  something you discover by dropping a row a few pixels right.
- **No custom domains**, and no per-unit pages for multi-room properties.
- **No rate limiting** on log-in, sign-up, password reset or the guest report
  form. Put the app behind a proxy or platform limit (e.g. Vercel / Cloudflare)
  before launch.
- **Invoices are Stripe's**, not KSeF fakturas; see the market notes above.

## Moving to production

1. **Database.** Change `provider` to `postgresql` in `prisma/schema.prisma` and
   swap the adapter in `src/lib/db.ts` for `@prisma/adapter-pg`. Nothing else
   refers to the database engine.
2. **Uploads.** `src/lib/storage.ts` writes to `public/uploads`. Replace its one
   `saveUpload` function with R2 / Vercel Blob.
3. **Stripe.** Follow "Going live with payments" above.
4. **Email.** Set `RESEND_API_KEY` and an `EMAIL_FROM` on a domain verified in
   Resend.
5. **Admin.** `npm run admin -- grant you@example.com` on the production database.
