import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { LoadingState } from "@/components/ui/loading-state";

export const metadata = { title: "Sign in - AlumniKonneQt" };

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading sign-in form" />}>
      <LoginForm emailOtpEnabled={process.env.EMAIL_OTP_ENABLED === "true"} accountEmailEnabled={process.env.ACCOUNT_EMAIL_ENABLED === "true"} />
    </Suspense>
  );
}
