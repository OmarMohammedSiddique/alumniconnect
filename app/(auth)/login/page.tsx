import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { LoadingState } from "@/components/ui/loading-state";
import { DemoSwitcher } from "@/components/demo-switcher";
import { listDemoAccounts } from "@/lib/demo-accounts";

export const metadata = { title: "Sign in - AlumniKonneQt" };

export default async function LoginPage() {
  const demoAccounts = await listDemoAccounts();
  return (
    <>
      <Suspense fallback={<LoadingState label="Loading sign-in form" />}>
        <LoginForm emailOtpEnabled={process.env.EMAIL_OTP_ENABLED === "true"} accountEmailEnabled={process.env.ACCOUNT_EMAIL_ENABLED === "true"} />
      </Suspense>
      <DemoSwitcher accounts={demoAccounts} variant="panel" />
    </>
  );
}
