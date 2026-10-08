import { createHash, randomBytes } from "node:crypto";
import { db } from "../src/lib/db.js";
import { hashPassword } from "../src/lib/auth.js";
import { trialEndDate } from "../src/lib/subscription.js";
import { parseSiteDoc } from "../src/site/repair.js";
import { buildTemplate } from "../src/site/templates.js";

/*
 * End-to-end check against a running dev server.
 *   npm run dev            (in one terminal)
 *   npm run verify:e2e     (in another)
 */

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

let failures = 0;
function check(label: string, passed: boolean, detail = "") {
  console.log(`${passed ? "  PASS" : "  FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!passed) failures++;
}

/* Creates an account the way signup does, and returns a usable cookie. */
async function makeAccount(email: string, opts: { trialEndsAt?: Date } = {}) {
  await db.user.deleteMany({ where: { email } });

  const user = await db.user.create({
    data: { email, name: email, passwordHash: hashPassword("password1234") },
  });
  const org = await db.organization.create({
    data: {
      name: email,
      ownerId: user.id,
      status: "trialing",
      trialEndsAt: opts.trialEndsAt ?? trialEndDate(),
    },
  });
  await db.membership.create({ data: { userId: user.id, orgId: org.id, role: "owner" } });

  const token = randomBytes(32).toString("base64url");
  await db.session.create({
    data: {
      tokenHash: createHash("sha256").update(token).digest("hex"),
      userId: user.id,
      expiresAt: new Date(Date.now() + 86_400_000),
    },
  });

  return { user, org, cookie: `sg_session=${token}` };
}

async function makeProperty(orgId: string, slug: string) {
  await db.property.deleteMany({ where: { slug } });
  const doc = JSON.stringify(buildTemplate("general", slug));
  return db.property.create({
    data: {
      orgId,
      slug,
      name: slug,
      shortCode: randomBytes(5).toString("hex"),
      draft: doc,
      published: doc,
      publishedAt: new Date(),
    },
  });
}

const get = async (path: string, cookie?: string) => {
  const response = await fetch(`${BASE}${path}`, { headers: cookie ? { cookie } : {} });
  return { status: response.status, html: await response.text() };
};

const patch = (id: string, doc: unknown, cookie?: string) =>
  fetch(`${BASE}/api/sites/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ doc }),
  });

const publish = (id: string, cookie?: string) =>
  fetch(`${BASE}/api/sites/${id}/publish`, {
    method: "POST",
    headers: cookie ? { cookie } : {},
  });

async function main() {
  const alice = await makeAccount("alice.e2e@example.com");
  const bob = await makeAccount("bob.e2e@example.com");
  const expired = await makeAccount("expired.e2e@example.com", {
    trialEndsAt: new Date(Date.now() - 86_400_000),
  });

  const aliceSite = await makeProperty(alice.org.id, "alice-e2e");
  const expiredSite = await makeProperty(expired.org.id, "expired-e2e");
  const marker = `E2E-${Date.now()}`;
  const extraEmails: string[] = [];

  console.log("\n1. Guest site serves the published version");
  {
    const { status, html } = await get("/s/alice-e2e/en");
    check("home grid returns 200", status === 200, `status ${status}`);
    check("renders a tile label", html.includes("House rules"));
    check("icons are inline SVG, not fetched", html.includes("<svg"));
  }

  console.log("\n2. Writes require a session");
  {
    const p = await patch(aliceSite.id, {});
    check("PATCH without a session is 401", p.status === 401, `status ${p.status}`);
    const pub = await publish(aliceSite.id);
    check("publish without a session is 401", pub.status === 401, `status ${pub.status}`);

    const upload = await fetch(`${BASE}/api/upload`, { method: "POST", body: new FormData() });
    check("upload without a session is 401", upload.status === 401, `status ${upload.status}`);
  }

  console.log("\n3. One organisation cannot touch another's apartment");
  {
    const doc = parseSiteDoc(aliceSite.draft);
    doc.tiles[0].label.en = "HACKED";

    const p = await patch(aliceSite.id, doc, bob.cookie);
    check("Bob's PATCH on Alice's site is 404", p.status === 404, `status ${p.status}`);

    const pub = await publish(aliceSite.id, bob.cookie);
    check("Bob's publish on Alice's site is 404", pub.status === 404, `status ${pub.status}`);

    const row = await db.property.findUniqueOrThrow({ where: { id: aliceSite.id } });
    check("Alice's draft is untouched", !row.draft.includes("HACKED"));

    const preview = await get("/s/alice-e2e/en?preview=1", bob.cookie);
    check("Bob cannot preview Alice's draft", preview.status === 200);

    const editor = await get(`/en/dashboard/sites/${aliceSite.id}`, bob.cookie);
    check("Bob's editor page is 404", editor.status === 404, `status ${editor.status}`);
  }

  console.log("\n4. Autosave writes the draft only");
  {
    const doc = parseSiteDoc(aliceSite.draft);
    doc.tiles[0].label.en = marker;

    const response = await patch(aliceSite.id, doc, alice.cookie);
    const body = (await response.json()) as { hasUnpublishedChanges?: boolean };
    check("PATCH accepted", response.ok, `status ${response.status}`);
    check("reports unpublished changes", body.hasUnpublishedChanges === true);

    const row = await db.property.findUniqueOrThrow({ where: { id: aliceSite.id } });
    check("draft has the edit", row.draft.includes(marker));
    check("published does not", !row.published?.includes(marker));

    const guest = await get("/s/alice-e2e/en");
    check("guests still see the old version", !guest.html.includes(marker));

    const anon = await get("/s/alice-e2e/en?preview=1");
    check("anonymous preview shows published", !anon.html.includes(marker));

    const owner = await get("/s/alice-e2e/en?preview=1", alice.cookie);
    check("owner preview shows the draft", owner.html.includes(marker));
  }

  console.log("\n5. Publishing promotes the draft and snapshots it");
  {
    const before = await db.siteVersion.count({ where: { propertyId: aliceSite.id } });
    const response = await publish(aliceSite.id, alice.cookie);
    check("publish accepted", response.ok, `status ${response.status}`);

    const after = await db.siteVersion.count({ where: { propertyId: aliceSite.id } });
    check("version snapshot written", after === before + 1, `${before} -> ${after}`);

    const guest = await get("/s/alice-e2e/en");
    check("guest page now shows the change", guest.html.includes(marker));
  }

  console.log("\n6. An expired trial blocks editing but not guests");
  {
    const doc = parseSiteDoc(expiredSite.draft);
    doc.tiles[0].label.en = "SHOULD-NOT-SAVE";

    const p = await patch(expiredSite.id, doc, expired.cookie);
    check("PATCH is 402 Payment Required", p.status === 402, `status ${p.status}`);

    const pub = await publish(expiredSite.id, expired.cookie);
    check("publish is 402", pub.status === 402, `status ${pub.status}`);

    const guest = await get("/s/expired-e2e/en");
    check("the guest site is still up", guest.status === 200, `status ${guest.status}`);
  }

  console.log("\n7. Checkout in simulated mode activates a plan");
  {
    const { startCheckout } = await import("../src/lib/billing.js");
    const result = await startCheckout({
      orgId: bob.org.id,
      email: bob.user.email,
      plan: "complex",
      interval: "yearly",
      successUrl: `${BASE}/ok`,
      cancelUrl: `${BASE}/no`,
    });

    check("runs in simulated mode without Stripe keys", result.mode === "simulated", result.mode);

    const org = await db.organization.findUniqueOrThrow({ where: { id: bob.org.id } });
    check("plan recorded", org.plan === "complex", String(org.plan));
    check("interval recorded", org.billingInterval === "yearly", String(org.billingInterval));
    check("period end set", org.currentPeriodEnd !== null);
  }

  console.log("\n8. The Stripe webhook refuses unsigned calls");
  {
    const response = await fetch(`${BASE}/api/stripe/webhook`, {
      method: "POST",
      body: JSON.stringify({ type: "customer.subscription.updated" }),
    });
    // 503 when Stripe is not configured, 400 when it is but the signature is missing.
    check("unsigned webhook rejected", [400, 503].includes(response.status), `status ${response.status}`);
  }

  console.log("\n9. A malformed document cannot break a guest page");
  {
    await db.property.update({
      where: { id: aliceSite.id },
      data: { published: '{"tiles":[null,"junk",{"id":"x"}],"theme":{"radius":9999}}' },
    });
    const { status, html } = await get("/s/alice-e2e/en");
    check("page still renders", status === 200, `status ${status}`);
    check("no server error", !html.includes("Internal Server Error"));

    const restored = await db.property.findUniqueOrThrow({ where: { id: aliceSite.id } });
    await db.property.update({
      where: { id: aliceSite.id },
      data: { published: restored.draft },
    });
  }

  console.log("\n10. Guest issue reports");
  {
    const before = await db.issueReport.count({ where: { propertyId: aliceSite.id } });
    const form = new FormData();
    form.set("propertyId", aliceSite.id);
    form.set("locale", "pl");
    form.set("description", `${marker} radiator not working`);

    const response = await fetch(`${BASE}/api/issues`, { method: "POST", body: form });
    check("issue accepted", response.ok, `status ${response.status}`);

    const after = await db.issueReport.count({ where: { propertyId: aliceSite.id } });
    check("issue row created", after === before + 1, `${before} -> ${after}`);

    const bad = await fetch(`${BASE}/api/issues`, { method: "POST", body: new FormData() });
    check("empty issue rejected", bad.status === 400, `status ${bad.status}`);
  }

  console.log("\n11. Deep links, languages and the QR redirect");
  {
    for (const [path, needle] of [
      ["/s/alice-e2e/en/arrival/wifi", "Wi-Fi"],
      ["/s/alice-e2e/pl/arrival/wifi", "Bezpłatne Wi-Fi"],
      ["/s/alice-e2e/es/arrival/wifi", "Wi-Fi gratuito"],
    ] as const) {
      const { status, html } = await get(path);
      check(`${path} renders`, status === 200 && html.includes(needle), `status ${status}`);
    }

    const missing = await fetch(`${BASE}/s/alice-e2e/en/nope`, { redirect: "manual" });
    check("unknown tile is 404", missing.status === 404, `status ${missing.status}`);

    const qr = await fetch(`${BASE}/q/${aliceSite.shortCode}`, { redirect: "manual" });
    check("QR short code redirects", [302, 307].includes(qr.status), `status ${qr.status}`);
  }

  console.log("\n12. Public pages render in all three languages");
  {
    for (const locale of ["en", "es", "pl"]) {
      const home = await get(`/${locale}`);
      check(`/${locale} marketing page`, home.status === 200, `status ${home.status}`);

      const signup = await get(`/${locale}/signup`);
      check(`/${locale}/signup`, signup.status === 200, `status ${signup.status}`);
    }

    const onboarding = await get("/en/onboarding/template", alice.cookie);
    check("onboarding template picker", onboarding.status === 200, `status ${onboarding.status}`);
    check("offers three templates", onboarding.html.includes("Cabins template"));
  }

  console.log("\n13. The printable QR code");
  {
    const anon = await fetch(`${BASE}/api/sites/${aliceSite.id}/qr`);
    check("QR download without a session is 401", anon.status === 401, `status ${anon.status}`);

    const foreign = await fetch(`${BASE}/api/sites/${aliceSite.id}/qr`, { headers: { cookie: bob.cookie } });
    check("Bob's QR download for Alice's site is 404", foreign.status === 404, `status ${foreign.status}`);

    const png = await fetch(`${BASE}/api/sites/${aliceSite.id}/qr?format=png`, { headers: { cookie: alice.cookie } });
    const bytes = new Uint8Array(await png.arrayBuffer());
    check("PNG download works", png.ok && png.headers.get("content-type") === "image/png", `status ${png.status}`);
    check("PNG has the PNG signature", bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e);

    const svg = await fetch(`${BASE}/api/sites/${aliceSite.id}/qr?format=svg`, { headers: { cookie: alice.cookie } });
    check("SVG download works", svg.ok && (await svg.text()).includes("<svg"), `status ${svg.status}`);

    const page = await get(`/en/dashboard/sites/${aliceSite.id}/qr`, alice.cookie);
    check("QR card page renders", page.status === 200, `status ${page.status}`);
    check("card encodes the permanent /q/ address", page.html.includes(`/q/${aliceSite.shortCode}`));
    check("card prompts in every published language", page.html.includes("Zeskanuj") && page.html.includes("Escanea"));

    const foreignPage = await get(`/en/dashboard/sites/${aliceSite.id}/qr`, bob.cookie);
    check("Bob's QR page for Alice's site is 404", foreignPage.status === 404, `status ${foreignPage.status}`);
  }

  console.log("\n14. The owner's report inbox");
  {
    const report = await db.issueReport.findFirstOrThrow({ where: { propertyId: aliceSite.id } });

    const inbox = await get("/en/dashboard/inbox", alice.cookie);
    check("Alice's inbox renders", inbox.status === 200, `status ${inbox.status}`);
    check("Alice sees the guest's report", inbox.html.includes(marker));

    const foreignInbox = await get("/en/dashboard/inbox", bob.cookie);
    check("Bob does not see Alice's report", !foreignInbox.html.includes(marker));

    const { setIssueStatus } = await import("../src/lib/inbox.js");
    check("Bob cannot resolve Alice's report", (await setIssueStatus(bob.org.id, report.id, "resolved")) === false);
    const untouched = await db.issueReport.findUniqueOrThrow({ where: { id: report.id } });
    check("the report is still open", untouched.status === "new", untouched.status);

    const dashboard = await get("/en/dashboard", alice.cookie);
    check("dashboard flags the new report", dashboard.html.includes("1 new report"));

    check("Alice can resolve it", (await setIssueStatus(alice.org.id, report.id, "resolved")) === true);
    const resolved = await get("/en/dashboard/inbox?show=resolved", alice.cookie);
    check("it moves to the resolved tab", resolved.html.includes(marker));
  }

  console.log("\n15. Panel pages and the light/dark preference");
  {
    for (const path of ["/en/dashboard", "/en/dashboard/billing", `/en/dashboard/sites/${aliceSite.id}`]) {
      const { status } = await get(path, alice.cookie);
      check(`${path} renders for the owner`, status === 200, `status ${status}`);
    }

    const system = await get("/en");
    check("no cookie follows the OS (no data-theme)", !/<html[^>]*data-theme=/.test(system.html));

    const dark = await get("/en", "sg_theme=dark");
    check("a saved choice is rendered by the server", /<html[^>]*data-theme="dark"/.test(dark.html));

    const junk = await get("/en", "sg_theme=%22%3E%3Cscript%3E");
    check("an unknown value is ignored", !/<html[^>]*data-theme=/.test(junk.html));

    const guest = await get("/s/alice-e2e/en", "sg_theme=dark");
    check("guest sites never get the panel theme", !guest.html.includes('data-theme="dark"'));
  }

  console.log("\n16. Payments: trial carry-over, prepaid years, idempotency");
  {
    const billing = await import("../src/lib/billing.js");
    const carol = await makeAccount("carol.e2e@example.com");
    extraEmails.push(carol.user.email);
    const trialEnd = carol.org.trialEndsAt!;

    // Choosing a plan mid-trial keeps the trial's end date; it does not restart it.
    await billing.startCheckout({
      orgId: carol.org.id, email: carol.user.email, plan: "one", interval: "monthly",
      successUrl: `${BASE}/ok`, cancelUrl: `${BASE}/no`,
    });
    let org = await db.organization.findUniqueOrThrow({ where: { id: carol.org.id } });
    check("choosing a plan keeps the trial end", org.trialEndsAt?.getTime() === trialEnd.getTime());
    check("no payment is recorded during the trial", (await db.payment.count({ where: { orgId: carol.org.id } })) === 0);

    // A prepaid year starts when the trial ends, so no trial days are lost.
    const result = await billing.startPrepaidCheckout({
      orgId: carol.org.id, email: carol.user.email, plan: "complex", successUrl: `${BASE}/ok`, cancelUrl: `${BASE}/no`,
    });
    check("prepaid checkout runs simulated", result.mode === "simulated", result.mode);
    org = await db.organization.findUniqueOrThrow({ where: { id: carol.org.id } });
    const expectedEnd = new Date(trialEnd);
    expectedEnd.setFullYear(expectedEnd.getFullYear() + 1);
    check("status becomes prepaid", org.status === "prepaid", org.status);
    check("the year starts after the trial", org.currentPeriodEnd?.getTime() === expectedEnd.getTime());
    check("the payment is recorded", (await db.payment.count({ where: { orgId: carol.org.id, kind: "prepaid" } })) === 1);

    // Stripe may deliver the same webhook twice; a year is granted once.
    const grant = { orgId: carol.org.id, plan: "complex" as const, externalId: `cs_test_${marker}`, amount: 149000, method: "blik" };
    const first = await billing.grantPrepaid(grant);
    const afterFirst = (await db.organization.findUniqueOrThrow({ where: { id: carol.org.id } })).currentPeriodEnd;
    const second = await billing.grantPrepaid(grant);
    const afterSecond = (await db.organization.findUniqueOrThrow({ where: { id: carol.org.id } })).currentPeriodEnd;
    check("first delivery grants a year", first === "granted", first);
    check("a repeated delivery is ignored", second === "duplicate" && afterFirst?.getTime() === afterSecond?.getTime(), second);

    // A running subscription must not be paid for twice.
    await db.organization.update({ where: { id: carol.org.id }, data: { status: "active", stripeSubscriptionId: `sub_${marker}` } });
    const refused = await billing.startPrepaidCheckout({
      orgId: carol.org.id, email: carol.user.email, plan: "one", successUrl: `${BASE}/ok`, cancelUrl: `${BASE}/no`,
    });
    check("prepaid is refused on top of a live subscription", refused.mode === "refused", refused.mode);

    // An ended prepaid year stops editing, but not guests.
    await db.organization.update({
      where: { id: carol.org.id },
      data: { status: "prepaid", stripeSubscriptionId: null, currentPeriodEnd: new Date(Date.now() - 60_000) },
    });
    const carolSite = await makeProperty(carol.org.id, "carol-e2e");
    const p = await patch(carolSite.id, parseSiteDoc(carolSite.draft), carol.cookie);
    check("an ended prepaid year blocks editing (402)", p.status === 402, `status ${p.status}`);
    check("its guest site stays up", (await get("/s/carol-e2e/en")).status === 200);

    const page = await get("/en/dashboard/billing?plan=complex&interval=yearly", alice.cookie);
    check("billing offers BLIK / Przelewy24 for a year", page.status === 200 && page.html.includes("Przelewy24"));
  }

  console.log("\n17. Admin area");
  {
    const notAdmin = await get("/en/admin", alice.cookie);
    check("a normal owner gets a 404 at /admin", notAdmin.status === 404, `status ${notAdmin.status}`);
    const anon = await get("/en/admin");
    check("anonymous gets a 404 at /admin", anon.status === 404, `status ${anon.status}`);

    await db.user.update({ where: { id: bob.user.id }, data: { isAdmin: true } });
    for (const path of ["/en/admin", "/en/admin/accounts", "/en/admin/payments", `/en/admin/accounts/${alice.org.id}`]) {
      const { status } = await get(path, bob.cookie);
      check(`admin opens ${path}`, status === 200, `status ${status}`);
    }
    const search = await get("/en/admin/accounts?q=alice.e2e", bob.cookie);
    check("admin search finds the account", search.html.includes("alice.e2e@example.com"));
    const editor = await get(`/en/dashboard/sites/${aliceSite.id}`, bob.cookie);
    check("admin rights do not open someone else's editor", editor.status === 404, `status ${editor.status}`);
    await db.user.update({ where: { id: bob.user.id }, data: { isAdmin: false } });
  }

  console.log("\n18. Account, apartment settings, guide and history");
  {
    for (const path of ["/en/dashboard/account", "/en/dashboard/guide", `/en/dashboard/sites/${aliceSite.id}/settings`]) {
      const { status } = await get(path, alice.cookie);
      check(`${path} renders`, status === 200, `status ${status}`);
    }
    const foreignSettings = await get(`/en/dashboard/sites/${aliceSite.id}/settings`, bob.cookie);
    check("Bob's settings page for Alice's site is 404", foreignSettings.status === 404, `status ${foreignSettings.status}`);

    const list = await fetch(`${BASE}/api/sites/${aliceSite.id}/versions`, { headers: { cookie: alice.cookie } });
    const { versions } = (await list.json()) as { versions: { id: string }[] };
    check("owner lists published versions", list.ok && versions.length >= 1, `status ${list.status}`);

    const one = await fetch(`${BASE}/api/sites/${aliceSite.id}/versions/${versions[0].id}`, { headers: { cookie: alice.cookie } });
    check("owner loads a version", one.ok && Array.isArray(((await one.json()) as { doc: { tiles: unknown[] } }).doc.tiles));

    const foreignList = await fetch(`${BASE}/api/sites/${aliceSite.id}/versions`, { headers: { cookie: bob.cookie } });
    check("Bob cannot list Alice's versions", foreignList.status === 404, `status ${foreignList.status}`);

    const expiredVersions = await db.siteVersion.findFirst({ where: { propertyId: expiredSite.id } });
    if (expiredVersions) {
      const crossed = await fetch(`${BASE}/api/sites/${aliceSite.id}/versions/${expiredVersions.id}`, { headers: { cookie: alice.cookie } });
      check("a version of another apartment is 404", crossed.status === 404, `status ${crossed.status}`);
    }
  }

  console.log("\n19. Password reset links");
  {
    const { resetPassword, resetTokenValid } = await import("../src/lib/password-reset.js");
    const { verifyPassword } = await import("../src/lib/auth.js");
    const token = randomBytes(32).toString("base64url");
    await db.passwordReset.create({
      data: {
        tokenHash: createHash("sha256").update(token).digest("hex"),
        userId: alice.user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    check("a fresh link is valid", await resetTokenValid(token));
    check("a made-up link is not", !(await resetTokenValid("made-up")));
    check("a short password is refused", (await resetPassword(token, "short")) === "weak");
    check("the link resets the password", (await resetPassword(token, "brand-new-password")) === "ok");
    const user = await db.user.findUniqueOrThrow({ where: { id: alice.user.id } });
    check("the new password works", verifyPassword("brand-new-password", user.passwordHash));
    check("every session was signed out", (await db.session.count({ where: { userId: alice.user.id } })) === 0);
    check("the link works only once", (await resetPassword(token, "another-password")) === "invalid");

    const page = await get("/en/reset?token=made-up");
    check("an invalid link says so", page.status === 200 && page.html.includes("no longer works"));
  }

  console.log("\n20. Not-found pages");
  {
    const panel = await get("/en/definitely-not-a-page");
    check("unknown panel path is a 404 page", panel.status === 404 && panel.html.includes("This page does not exist"), `status ${panel.status}`);
    const qr = await fetch(`${BASE}/q/NO-SUCH-CODE`, { redirect: "manual", headers: { "accept-language": "es" } });
    const qrHtml = await qr.text();
    check("unknown QR code is a readable 404, not JSON", qr.status === 404 && qrHtml.includes("<html"), `status ${qr.status}`);
    check("it speaks the guest's language", qrHtml.includes("Esta página no existe"));
    const site = await get("/s/no-such-site-e2e");
    check("unknown guest site is a 404", site.status === 404, `status ${site.status}`);
  }

  /* Clean up the accounts this run created. */
  await db.user.deleteMany({
    where: { email: { in: [alice.user.email, bob.user.email, expired.user.email, ...extraEmails] } },
  });

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
