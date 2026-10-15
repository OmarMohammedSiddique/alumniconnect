import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { LoadingState } from "@/components/ui/loading-state";

export const metadata = { title: "Sign in - AlumniConnect" };

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading sign-in form" />}>
      <LoginForm />
    </Suspense>
  );
}
