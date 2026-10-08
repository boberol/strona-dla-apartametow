# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

StayGuide — a subscription product where apartment owners build a QR-code guest
guide. Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Prisma 7
+ SQLite · next-intl · Stripe.

## Commands

```bash
npm run dev            # dev server on :3000
npm run build          # production build (also runs tsc)
npm run typecheck      # tsc --noEmit
npm test               # vitest, 7 suites
npm run db:push        # apply prisma/schema.prisma to dev.db
npm run db:seed        # reset the demo account (demo@example.com / demo1234)
npm run db:reset       # drop the database and reseed
npm run verify:e2e     # 110 checks; needs `npm run dev` running in another shell
npm run admin -- list  # also: grant <email> | revoke <email> | create <email>
```

Single test file or single test:

```bash
npx vitest run src/site/mutations.test.ts
npx vitest run -t "nests a tile under its previous sibling"
```

`verify:e2e` creates and deletes its own throwaway accounts against the dev
database. It covers things unit tests cannot: cross-organisation isolation,
draft/publish separation, `402` on an expired trial or prepaid year, webhook
idempotency, admin access, password reset links, 404s and the guest routes.
After `prisma generate`, restart `npm run dev`: it caches the old client.

Prisma 7 notes: config lives in `prisma7.config.ts` (auto-detected, no `--config`
flag needed), the datasource has no `url` (it comes from the config), the client
is generated into `src/generated/prisma`, and it connects through a **driver
adapter** (`@prisma/adapter-better-sqlite3` in `src/lib/db.ts`). Changing the
schema requires `npm run db:push` **and** `npx prisma generate`.

## Architecture

### The site document is the centre of everything

A property's entire guest site is one JSON document (`SiteDoc`) stored as **text**
in two columns: `draft` (what the editor writes) and `published` (what guests
read). Publishing copies draft over published and appends a `SiteVersion`
snapshot for rollback.

Text rather than a native JSON column is deliberate: every read is zod-validated
anyway and nothing queries inside the document, so SQLite (dev) and Postgres
(prod) behave identically. A guest page load is a single row read.

- `src/site/schema.ts` — zod shapes for `SiteDoc` / `Tile` / `Block` / `Theme`.
  The strict schema; it has no `.default()`s so input and output types match.
- `src/site/repair.ts` — `parseSiteDoc()` **never throws**. It validates fast and
  on failure repairs field by field, dropping only the individual tiles or blocks
  it cannot rescue, clamping out-of-range values, de-duplicating sibling slugs
  and ids, and capping nesting depth. Anything reading a stored document goes
  through it. Do not add a code path that parses a document any other way.
- `src/site/mutations.ts` — pure immutable tree operations used by the editor.
  They apply **at the first level that matches, then stop** (`applyOnce`); a
  naive recursive walk re-applies to a tile it just moved. There are regression
  tests for this.

### Block types live in three files, on purpose

Adding a block type means touching all three:

1. `src/site/schema.ts` — the zod variant in the `blockSchema` discriminated union
2. `src/components/guest/BlockRenderer.tsx` — how a guest sees it
3. `src/components/editor/BlockInspector.tsx` — how an owner edits it

They are split so the editor's form code never ships in the guest bundle. Also
add defaults in `createBlock()` and metadata in `BLOCK_META`
(`src/site/factories.ts`), plus message keys in all three locale files.

### One renderer, never two

The editor's phone preview is an `<iframe>` of the real guest app at
`?preview=1`, so the preview cannot drift from what a guest sees. The trade-off
is that it refreshes after each autosave (~700 ms debounce) instead of
re-rendering instantly. Do not build a second client-side renderer to make the
preview feel faster.

The one exception is `components/panel/TemplatePreview.tsx`, a static
look-preview used before a property exists. It reuses the guest theme variables
and `.gg-tile` classes rather than re-implementing them.

### Authorisation

`src/lib/guard.ts` is the gate for every write. It resolves the session **and**
proves the target property belongs to the caller's organisation. A property
owned by someone else returns **404, not 403**, so responses cannot be used to
probe which ids exist. Route handlers must not check a session and then trust
the id in the URL.

- **Admin** (`User.isAdmin`, `currentAdmin()`): admin pages call `notFound()` for
  everyone else, and every admin server action re-checks the flag itself.
  Admin rights do not bypass `accessProperty`; an admin cannot open another
  organisation's editor.
- `getSessionUser()` is wrapped in React `cache()`, so `PanelShell` reads the
  session itself; pages pass only `locale` and `active`.
- `?preview=1` serves the unpublished draft and requires the owning org's
  session (`previewAllowed(requested, slug)`); everyone else silently gets the
  published version. Drafts hold door codes and Wi-Fi passwords.
- Passwords: scrypt from `node:crypto`, per-password salt, constant-time compare.
  Sessions are database rows keyed by a SHA-256 hash of the cookie value.

### Subscription state gates editing, not guests

`src/lib/subscription.ts` is pure and decides entitlements from our own database;
Stripe webhooks only ever write the fields it reads. When a trial expires,
**editing stops but published guest sites stay online** — a guest in the
apartment should never see a billing problem. Writes return `402` and the editor
stops autosaving rather than failing on every keystroke.

### Billing: two ways to pay, one simulated fallback

A card **subscription** (Stripe-managed status) or a **prepaid year** paid once
with BLIK / Przelewy24 / card (status `prepaid`, access until
`currentPeriodEnd`, no renewal). `coveredUntil()` decides when paying starts,
so a plan choice never grants a second trial or loses days. Every payment is a
`Payment` row with a unique `externalId` (Stripe invoice / session id): keep
`grantPrepaid` idempotent on it, because Stripe redelivers webhooks. Never sell a
prepaid year while `hasLiveSubscription()`.


`src/lib/billing.ts`: with `STRIPE_SECRET_KEY` set it is a real Checkout /
webhook / Customer Portal integration; without it, choosing a plan activates the
subscription locally so the whole flow is testable. Keep both paths working when
changing billing. Plans and prices live only in `src/lib/plans.ts`.

Polish-market constraints that shaped this (details in README): Przelewy24 does
not support recurring payments at all and recurring BLIK is Stripe private
preview, so subscriptions are card-only here; KSeF e-invoicing is mandatory for
B2B, so invoicing belongs with a KSeF-integrated provider, not hand-rolled.

### Email has a development fallback

`sendEmail()` (`src/lib/email.ts`) uses Resend when `RESEND_API_KEY` is set;
otherwise development prints to the console and production sends nothing. Never
log an email body in production (it can hold a reset link). `sendEmail` never
throws, so a mail failure never fails the request that triggered it. Emails use
`User.locale`, refreshed at each sign-in.

### Two independent locale systems

- **Panel and marketing**: next-intl, URL-prefixed `/{locale}/...`, strings in
  `messages/{en,es,pl}.json`. `src/proxy.ts` (the Next 16 `proxy` convention,
  renamed from `middleware`) adds the prefix and deliberately excludes
  `/api`, `/q`, `/s` and static paths.
- **Guest app**: its own `/s/{slug}/{lang}/...` segment, restricted to the
  languages that owner published, so a guest can never land on a page the owner
  never filled in. Content is owner-authored per language inside the document and
  falls back to the site's default language when a field is empty.

The three message files must stay key-for-key identical. `t("x")` against a
missing key throws at render time.

The owner's editing guide is prose, so it lives in `src/content/guide.ts`
rather than the message files; `guide.test.ts` keeps the sections identical
across languages.

### Not-found pages

Three levels: `app/[locale]/not-found.tsx` (panel; `[locale]/[...rest]` routes
unknown paths to it), `app/s/[slug]/[lang]/not-found.tsx` (inside a guest site),
and `app/not-found.tsx` for everything else, including unknown `/q/` codes. The
root one renders its own `<html>` because the root layout is a pass-through.

### Two design systems that must not leak

The partner panel (marketing, auth, onboarding, dashboard, editor) is navy with a
green accent in a light and a dark palette, scoped entirely to `.panel` in
`globals.css` (`--p-*` variables). Guest sites are themed by each owner via
`--brand`, `--tile-bg` etc. from `themeToCssVars()`. Panel styling must stay
inside `.panel`; guest styling uses the `gg-` prefix.

- `.panel` sits on the `<html>` of the `/[locale]` layout, together with
  `data-theme` from the `sg_theme` cookie (`src/lib/theme.ts`). No cookie means
  "follow the OS" through a `prefers-color-scheme` media query. **Never add
  another `.panel` element inside a page**: a nested one re-declares the light
  tokens without `data-theme` and breaks an explicit dark choice.
- Use the tokens (`var(--p-accent)`, `--p-warn-text`, `--p-danger-text`...), never
  a raw colour, or the element will be right in one palette only.
- The `panel-*` component classes live in `@layer components` so Tailwind
  utilities on the same element still win (`hidden sm:inline-flex` on a
  `.panel-btn`). Keep new ones there.
- Panel chrome icons are inline SVG paths in `components/panel/icons.tsx`; guest
  and owner-chosen content icons go through Iconify (below).

### Icons are resolved on the server

`src/site/icons.ts` renders Iconify icons to inline SVG from **bundled** sets
(`tabler`, `ph`, `carbon`) so guests fetch zero icon requests — the product this
models fires five icon API calls per page load. The editor's picker searches the
same bundled sets via `/api/icons`, so an owner cannot choose an icon the guest
app is unable to draw. Adding a set means adding a loader in `icons.ts`.

### Printed QR codes must never break

The QR encodes `/q/{shortCode}`, a permanent per-property code that redirects to
the current site. Renaming a property or changing its slug must never invalidate
a card already hung in a hallway, so never derive the printed URL from the slug.
`qrTarget()` in `src/lib/qr.ts` is the one place that builds it; the printable
card page and the PNG/SVG download route both use it.

### Guest reports

`/api/issues` (public, guest form) writes `IssueReport` rows; the owner reads
them at `/[locale]/dashboard/inbox`. Status changes go through
`setIssueStatus(orgId, ...)` in `src/lib/inbox.ts`, which scopes by organisation
so a foreign id silently changes nothing. Stored `photoUrls` is JSON text: read it
through `parsePhotoUrls()`, which only lets `/uploads/...` paths through.

## Conventions

- Uploads: client filenames are never used on disk, and the allow-list in
  `src/lib/storage.ts` picks the extension from the detected type.
- Owner-authored links go through `safeHref()` (`src/site/markdown.tsx`), which
  permits only `http(s):`, `mailto:`, `tel:` and relative paths.
- Rich text is a small Markdown subset rendered through React, never raw HTML.
