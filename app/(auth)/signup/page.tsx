import { SignupForm } from "./signup-form";

export const metadata = { title: "Sign up - AlumniKonneQt" };

export default function SignupPage() {
  return <SignupForm previewEnabled={process.env.NODE_ENV === "development"} />;
}
