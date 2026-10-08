/*
 * Outgoing email, with a development fallback.
 *
 * With RESEND_API_KEY set, mail goes out through Resend's HTTP API (no SDK
 * needed). Without it, development prints the message to the server console
 * so password resets and report alerts can be followed end to end -- the same
 * idea as simulated billing. Production without a key sends nothing and logs
 * only that it did not, because a reset link in a log file is a way into an
 * account.
 */

export type Email = {
  to: string | string[];
  subject: string;
  text: string;
};

export const emailEnabled = (): boolean => Boolean(process.env.RESEND_API_KEY);

const FROM = () => process.env.EMAIL_FROM ?? "StayGuide <onboarding@resend.dev>";

/** Never throws: a failed email must not fail the request that caused it. */
export async function sendEmail(email: Email): Promise<boolean> {
  const to = Array.isArray(email.to) ? email.to : [email.to];
  if (to.length === 0) return false;

  if (!emailEnabled()) {
    if (process.env.NODE_ENV === "production") {
      console.warn(`[email] RESEND_API_KEY is not set; not sending "${email.subject}"`);
    } else {
      console.info(`\n[email] (not sent: no RESEND_API_KEY)\nTo: ${to.join(", ")}\nSubject: ${email.subject}\n\n${email.text}\n`);
    }
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from: FROM(), to, subject: email.subject, text: email.text }),
    });
    if (!response.ok) console.error(`[email] Resend answered ${response.status} for "${email.subject}"`);
    return response.ok;
  } catch (error) {
    console.error("[email] could not reach Resend", error);
    return false;
  }
}
