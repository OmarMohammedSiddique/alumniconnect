import styles from "../login/login-sky.module.css";
import Link from "next/link";
import { cookies } from "next/headers";
import { AccountEmailForm } from "@/components/account-email-form";
import { ACCOUNT_EMAIL_FLOW, readAccountEmailChallenge } from "@/lib/account-email";

export const metadata = { title: "Reset password - AlumniKonneQt", robots: { index: false, follow: false } };
export default async function ForgotPasswordPage() {
  if (process.env.ACCOUNT_EMAIL_ENABLED !== "true") return <div className={styles.accountState}><h1 className="text-2xl font-medium">Password recovery is not available yet</h1><Link href="/login" className="underline">Return to sign in</Link></div>;
  const jar = await cookies();
  return <AccountEmailForm purpose="recovery" initialChallenge={readAccountEmailChallenge(jar.get(ACCOUNT_EMAIL_FLOW.recovery.cookie)?.value, "recovery")} />;
}
