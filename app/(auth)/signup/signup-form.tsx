"use client";

import { useActionState, useRef, useState, type ReactNode, type Ref } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { ProfilePhotoPicker } from "@/components/profile-photo-picker";
import { PASSWORD_RULES, getPasswordError } from "@/lib/signup-validation";
import { signUpWithArrival, type AuthState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { StatusMessage } from "@/components/ui/status-message";
import { CaptchaTokenInput, TurnstileWidget } from "@/components/turnstile-widget";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import { LoginJourney, WindowMark, type AuthJourneyHandle } from "../login/login-journey";
import styles from "../login/login-sky.module.css";

function SignupSurface({ children, compact = false, journey, previewEnabled }: { children: ReactNode; compact?: boolean; journey: Ref<AuthJourneyHandle>; previewEnabled?: boolean }) {
  return <LoginJourney ref={journey} surface="signup" previewEnabled={previewEnabled}><div className={styles.signupPage}><Card className={`${styles.signupCard} ${compact ? styles.confirmationCard : ""}`}><WindowMark />{children}</Card></div></LoginJourney>;
}

const initialState: AuthState = { error: null };
const ROLES = [
  { value: "mentee", label: "Mentee", description: "Find career guidance." },
  { value: "mentor", label: "Mentor", description: "Share your experience." },
] as const;

export function SignupForm({ previewEnabled = false }: { previewEnabled?: boolean }) {
  const journey = useRef<AuthJourneyHandle>(null);
  const [editingConfirmation, setEditingConfirmation] = useState(false);
  const [role, setRole] = useState<"mentee" | "mentor">("mentee");
  const [details, setDetails] = useState({ first_name: "", last_name: "", email: "" });
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [confirmationTouched, setConfirmationTouched] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const mismatch = confirmationTouched && password !== confirmation;
  const [state, formAction, pending] = useActionState(async (previous: AuthState, data: FormData) => {
    const result = await signUpWithArrival(previous, data);
    if (!result.error && result.confirmationRequired) {
      await journey.current?.play({ kind: "confirmation", onContinue: () => journey.current?.reset() });
    } else if (!result.error && result.redirectTo) {
      await journey.current?.play({ kind: "registered", destination: result.redirectTo });
    }
    if (result.confirmationRequired) { setEditingConfirmation(false); setPassword(""); setConfirmation(""); }
    return result;
  }, initialState);

  if (state.confirmationRequired && !editingConfirmation) return (
    <SignupSurface compact journey={journey}>
      <CardHeader>
        <CardTitle><h1 className="text-2xl font-medium">Check your email</h1></CardTitle>
        <CardDescription>{state.confirmationCodeEnabled ? "Enter the code from your registration email to continue." : "Follow the confirmation link in your email, then sign in to continue."}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <p>If you selected a picture, choose it again after verifying your email and signing in.</p>
        {state.confirmationEmail && <p className="break-words text-sm">Registration email: <strong>{state.confirmationEmail}</strong></p>}
        {state.confirmationCodeEnabled ? <Link href="/verify-email" className="inline-flex min-h-11 items-center font-medium text-primary underline">Enter confirmation code</Link> : <Link href="/login?next=/profile/photo" className="inline-flex min-h-11 items-center font-medium text-primary underline">Continue to sign in</Link>}
        <Button type="button" variant="outline" onClick={() => setEditingConfirmation(true)}>Correct registration details</Button>
      </CardContent>
    </SignupSurface>
  );

  return (
    <SignupSurface journey={journey} previewEnabled={previewEnabled && !pending}>
      <CardHeader>
        <CardTitle><h1 className="text-2xl font-medium tracking-tight">Create your account</h1></CardTitle>
        <CardDescription>Connect with Kenya Airways alumni and eligible participants. Registration does not verify employment or airline affiliation.</CardDescription>
      </CardHeader>
      {state.confirmationRequired && editingConfirmation && <CardContent><Button type="button" variant="outline" onClick={() => setEditingConfirmation(false)}>Return to pending confirmation</Button></CardContent>}
      <form action={formAction} aria-busy={pending} onSubmit={(event) => {
        const error = getPasswordError(password, confirmation);
        if (error) {
          event.preventDefault();
          setConfirmationTouched(true);
          setClientError(error);
          const field = PASSWORD_RULES.some((rule) => !rule.test(password)) ? "password" : "confirm_password";
          (event.currentTarget.elements.namedItem(field) as HTMLInputElement).focus();
        }
      }}>
        <CaptchaTokenInput token={captchaToken} />
        <CardContent className={styles.signupGrid}>
          <fieldset disabled={pending} className="grid min-w-0 content-start gap-3">
            <legend className="mb-3 text-base font-medium">Account details</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid min-w-0 gap-1.5">
                <Label htmlFor="first_name">First name</Label>
                <Input id="first_name" name="first_name" required maxLength={100} autoComplete="given-name" value={details.first_name} onChange={(event) => setDetails({ ...details, first_name: event.target.value })} />
              </div>
              <div className="grid min-w-0 gap-1.5">
                <Label htmlFor="last_name">Last name</Label>
                <Input id="last_name" name="last_name" required maxLength={100} autoComplete="family-name" value={details.last_name} onChange={(event) => setDetails({ ...details, last_name: event.target.value })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" value={details.email} onChange={(event) => setDetails({ ...details, email: event.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">Password</Label>
              <PasswordInput id="password" name="password" required minLength={8} autoComplete="new-password" aria-describedby="password-help" value={password} onChange={(event) => { setPassword(event.target.value); setClientError(null); }} />
              <ul id="password-help" className="grid gap-x-3 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {PASSWORD_RULES.map((rule) => <li key={rule.label}>{password && rule.test(password) ? "✓" : "•"} {rule.label}</li>)}
              </ul>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="confirm_password">Verify password</Label>
              <PasswordInput id="confirm_password" name="confirm_password" required autoComplete="new-password" value={confirmation} aria-invalid={mismatch} aria-describedby="confirmation-help" onBlur={() => setConfirmationTouched(true)} onChange={(event) => { setConfirmation(event.target.value); setClientError(null); }} />
              <p id="confirmation-help" role="status" className={`min-h-4 text-xs ${mismatch ? "text-destructive" : "text-muted-foreground"}`}>
                {mismatch ? "Passwords do not match." : confirmation && password === confirmation ? "Passwords match." : "Enter the same password again."}
              </p>
            </div>
          </fieldset>

          <details className={styles.identityPreview}>
            <summary id="identity-title">Membership verification preview <span>Not active</span></summary>
            <p id="identity-help" className="text-xs leading-relaxed text-muted-foreground">Real ID collection is not enabled. These fields preview membership verification; please do not enter real identifiers.</p>
            <fieldset disabled aria-describedby="identity-help" className="grid min-w-0 gap-3">
              <legend className="sr-only">Identity details preview</legend>
              <div className="grid gap-1.5">
                <Label htmlFor="staff_id">Current or former staff ID</Label>
                <Input id="staff_id" name="staff_id" placeholder="Your staff or payroll number" autoComplete="off" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="identity_type">Identity document</Label>
                <select id="identity_type" name="identity_type" defaultValue="national_id" className="h-11 w-full min-w-0 border border-input bg-input/30 px-3 text-sm disabled:opacity-60">
                  <option value="national_id">National ID</option>
                  <option value="passport">Passport</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="identity_number">National ID / passport number</Label>
                <Input id="identity_number" name="identity_number" placeholder="Document number" autoComplete="off" />
              </div>
            </fieldset>
            <p className="text-xs leading-relaxed text-muted-foreground">Self-declared details do not establish employment or identity.</p>
          </details>

          <div className={styles.signupExtras}>
            <ProfilePhotoPicker disabled={pending} />
            <fieldset className="min-w-0" aria-describedby="role-help" disabled={pending}>
              <legend className="mb-2 text-sm font-medium">How would you like to take part?</legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {ROLES.map((option) => (
                  <label key={option.value} className={`flex min-h-11 cursor-pointer items-center gap-3 border px-3 py-2 ${role === option.value ? "border-primary bg-surface" : "border-border bg-card"}`}>
                    <input type="radio" name="role" value={option.value} checked={role === option.value} onChange={() => setRole(option.value)} className="size-4 shrink-0 accent-primary" />
                    <span className="min-w-0"><span className="block text-sm font-medium">{option.label}</span><span className="block text-xs text-muted-foreground">{option.description}</span></span>
                  </label>
                ))}
              </div>
              <p id="role-help" className="mt-2 text-xs text-muted-foreground">Choose one mentorship role for your account.</p>
            </fieldset>
          </div>
          <div className={styles.signupError}><TurnstileWidget action="signup" onToken={setCaptchaToken} resetKey={state} /></div>
          {(clientError || state.error) && <div className={styles.signupError}><StatusMessage tone="error">{clientError || state.error}</StatusMessage></div>}
        </CardContent>
        <CardFooter className={styles.signupFooter}>
          <div className="flex max-w-3xl items-start gap-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-muted-foreground"><span className="font-medium text-foreground">Proposed association privacy notice: </span>“Your information is protected under the Data Protection Act and will only be used for alumni association purposes.” <Link href="/privacy" className="font-medium text-primary underline underline-offset-4">Read the current prototype privacy position</Link>.</p>
          </div>
          <div className={styles.signupSubmit}>
            <Button type="submit" data-login-primary className={styles.primary} disabled={pending}>{pending ? "Creating account…" : "Create account"}</Button>
            <p className="text-center text-xs text-muted-foreground">Already registered? <Link href="/login" className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4">Sign in</Link></p>
          </div>
        </CardFooter>
      </form>
    </SignupSurface>
  );
}
