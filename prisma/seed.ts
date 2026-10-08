import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { nanoid } from "nanoid";
import { hashPassword } from "../src/lib/auth.js";
import { trialEndDate } from "../src/lib/subscription.js";
import { buildTemplate } from "../src/site/templates.js";

/*
 * Seeds a demo account so the whole flow -- log in, edit, publish, view as a
 * guest -- can be exercised immediately. The apartment is built from the same
 * "general" template a real signup would get, with the placeholder codes
 * replaced so the demo reads like a real property.
 */

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" }),
});

const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "demo1234";
const DEMO_NAME = "Sunny Apartments";

function demoDoc(): string {
  return JSON.stringify(buildTemplate("general", DEMO_NAME))
    .replaceAll("YourNetwork", "SunnyApartments_5G")
    .replaceAll("changeme", "morze2024")
    .replaceAll("0000", "1975");
}

async function main() {
  // Start from a clean demo account so reseeding is idempotent.
  await db.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const user = await db.user.create({
    data: {
      email: DEMO_EMAIL,
      name: DEMO_NAME,
      passwordHash: hashPassword(DEMO_PASSWORD),
    },
  });

  const org = await db.organization.create({
    data: {
      name: DEMO_NAME,
      ownerId: user.id,
      status: "trialing",
      trialEndsAt: trialEndDate(),
    },
  });

  await db.membership.create({ data: { userId: user.id, orgId: org.id, role: "owner" } });

  const doc = demoDoc();
  const property = await db.property.create({
    data: {
      orgId: org.id,
      slug: "demo",
      name: DEMO_NAME,
      shortCode: nanoid(8),
      draft: doc,
      published: doc,
      publishedAt: new Date(),
    },
  });

  await db.siteVersion.create({ data: { propertyId: property.id, doc } });

  console.log("Seeded demo account");
  console.log(`  login      : ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`  guest site : /s/${property.slug}`);
  console.log(`  QR target  : /q/${property.shortCode}`);
  console.log(`  editor     : /en/dashboard/sites/${property.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
