import { createInterface } from "node:readline/promises";
import { db } from "../src/lib/db.js";
import { hashPassword, isEmailShaped, normalizeEmail, passwordProblem } from "../src/lib/auth.js";
import { trialEndDate } from "../src/lib/subscription.js";

/*
 * Platform admin management.
 *
 *   npm run admin -- list                 who is an admin
 *   npm run admin -- grant  you@mail.com  make an existing account an admin
 *   npm run admin -- revoke you@mail.com  take admin away
 *   npm run admin -- create you@mail.com  create a new admin account; asks for
 *                                         the password (or reads ADMIN_PASSWORD)
 *   npm run admin -- password you@mail.com
 *                                         set a new password for any account and
 *                                         sign it out everywhere -- for when the
 *                                         reset email cannot be delivered
 *
 * Admin rights are never granted from the web UI to yourself, only here or by
 * another admin, so the first one always comes from someone with the server.
 */

const [command, rawEmail] = process.argv.slice(2);
const email = rawEmail ? normalizeEmail(rawEmail) : "";

async function askPassword(prompt = "Password for the new account (at least 8 characters): "): Promise<string> {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(prompt);
  rl.close();
  return answer;
}

async function main(): Promise<number> {
  switch (command) {
    case "list": {
      const admins = await db.user.findMany({ where: { isAdmin: true }, select: { email: true, createdAt: true } });
      if (admins.length === 0) console.log("No admins yet. Use: npm run admin -- grant you@example.com");
      for (const admin of admins) console.log(`${admin.email}  (since ${admin.createdAt.toISOString().slice(0, 10)})`);
      return 0;
    }

    case "grant":
    case "revoke": {
      if (!isEmailShaped(email)) return fail("Give the account's email address.");
      const user = await db.user.findUnique({ where: { email } });
      if (!user) return fail(`No account for ${email}. Sign up first, or use "create".`);
      await db.user.update({ where: { id: user.id }, data: { isAdmin: command === "grant" } });
      console.log(command === "grant" ? `${email} is now an admin.` : `${email} is no longer an admin.`);
      return 0;
    }

    case "create": {
      if (!isEmailShaped(email)) return fail("Give the new account's email address.");
      if (await db.user.findUnique({ where: { email } })) {
        return fail(`${email} already has an account. Use "grant" instead.`);
      }
      const password = await askPassword();
      if (passwordProblem(password)) return fail("The password needs at least 8 characters.");

      // Same shape as a signup: every account has an organisation.
      const user = await db.user.create({
        data: { email, name: null, passwordHash: hashPassword(password), isAdmin: true },
      });
      const org = await db.organization.create({
        data: { name: email, ownerId: user.id, status: "trialing", trialEndsAt: trialEndDate() },
      });
      await db.membership.create({ data: { userId: user.id, orgId: org.id, role: "owner" } });
      console.log(`Created admin account ${email}. Log in at /en/login.`);
      return 0;
    }

    case "password": {
      if (!isEmailShaped(email)) return fail("Give the account's email address.");
      const user = await db.user.findUnique({ where: { email } });
      if (!user) return fail(`No account for ${email}.`);
      const password = await askPassword("New password (at least 8 characters): ");
      if (passwordProblem(password)) return fail("The password needs at least 8 characters.");

      await db.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(password) } });
      // Same as a reset link: whoever had the old password is signed out.
      await db.session.deleteMany({ where: { userId: user.id } });
      console.log(`New password set for ${email}. Every existing session was signed out.`);
      return 0;
    }

    default:
      console.log("Usage: npm run admin -- list | grant <email> | revoke <email> | create <email> | password <email>");
      return command ? 1 : 0;
  }
}

function fail(message: string): number {
  console.error(message);
  return 1;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
