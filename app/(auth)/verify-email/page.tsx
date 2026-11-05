import Link from "next/link";
import { cookies } from "next/headers";
import { AccountEmailForm } from "@/components/account-email-form";
import { ACCOUNT_EMAIL_FLOW, readAccountEmailChallenge } from "@/lib/account-email";

export const metadata = { title: "Confirm email - AlumniKonneQt", robots: { index: false, follow: false } };
export default async function VerifyEmailPage() {
  if (process.env.ACCOUNT_EMAIL_ENABLED !== "true") return <div className="mx-auto grid max-w-lg gap-4"><h1 className="text-2xl font-semibold">Email confirmation codes are not available yet</h1><Link href="/login" className="underline">Return to sign in</Link></div>;
  const jar = await cookies();
  return <AccountEmailForm purpose="signup" initialChallenge={readAccountEmailChallenge(jar.get(ACCOUNT_EMAIL_FLOW.signup.cookie)?.value, "signup")} />;
}
