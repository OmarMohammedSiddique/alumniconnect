import styles from "../login-sky.module.css";
import { cookies } from "next/headers";
import Link from "next/link";
import { OTP_COOKIE, readOtpChallenge } from "@/lib/email-otp";
import { CodeForm } from "./code-form";

export const metadata = { title: "Email sign-in code - AlumniKonneQt", robots: { index: false, follow: false } };

export default async function EmailCodePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (process.env.EMAIL_OTP_ENABLED !== "true") return <div className={styles.accountState}><h1 className="text-2xl font-medium">Email sign-in is not available yet</h1><Link href="/login" className="underline underline-offset-4">Return to sign in</Link></div>;
  const jar = await cookies();
  const challenge = readOtpChallenge(jar.get(OTP_COOKIE)?.value);
  const { next } = await searchParams;
  return <CodeForm initialChallenge={challenge} next={typeof next === "string" ? next : ""} />;
}
