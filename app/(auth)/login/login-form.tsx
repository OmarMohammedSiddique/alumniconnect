"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, Eye, EyeOff } from "lucide-react";
import { GoogleSignIn } from "./google-sign-in";
import { LoginJourney, WindowMark, type AuthJourneyHandle } from "./login-journey";
import { signInWithArrival, type AuthState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusMessage } from "@/components/ui/status-message";
import { CaptchaTokenInput, TurnstileWidget } from "@/components/turnstile-widget";
import styles from "./login-sky.module.css";

const initialState: AuthState = { error: null };

export function LoginForm({ emailOtpEnabled = false, accountEmailEnabled = false, previewEnabled = false }: { emailOtpEnabled?: boolean; accountEmailEnabled?: boolean; previewEnabled?: boolean }) {
  const journey = useRef<AuthJourneyHandle>(null);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [state, formAction, pending] = useActionState(async (previous: AuthState, data: FormData) => {
    const result = await signInWithArrival(previous, data);
    if (!result.error && result.redirectTo) await journey.current?.play({ kind: "signed-in", destination: result.redirectTo });
    return result;
  }, initialState);
  const [visible, setVisible] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const params = useSearchParams();
  const next = params.get("next") ?? "";
  const passwordReset = params.get("password_reset") === "1";

  return <LoginJourney ref={journey} previewEnabled={previewEnabled && !pending}>
    <WindowMark />
    <div className={styles.heading}><h1>Sign in to AlumniKonneQt</h1><p>Your next connection starts here.</p></div>
    {passwordReset && <StatusMessage tone="success">Password updated. Sign in with your new password.</StatusMessage>}
    <form action={formAction} aria-busy={pending} className={styles.form}>
      <input type="hidden" name="next" value={next} />
      <CaptchaTokenInput token={captchaToken} />
      <div className={styles.field}><Label htmlFor="email">Email address</Label><Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" value={credentials.email} onChange={event => setCredentials(current => ({ ...current, email: event.target.value }))} /></div>
      <div className={styles.field}><div className={styles.passwordLabel}><Label htmlFor="password">Password</Label>{accountEmailEnabled && <Link href="/forgot-password">Forgot password?</Link>}</div>
        <div className={styles.passwordWrap}>
          <svg className={styles.passwordLock} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className={styles.shackle} d="M7.5 10V7a4.5 4.5 0 0 1 9 0v3" /><rect x="4.5" y="10" width="15" height="11" rx="3" /><path d="M12 14v3" /></svg>
          <Input id="password" name="password" type={visible ? "text" : "password"} required autoComplete="current-password" placeholder="Enter your password" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={credentials.password} onChange={event => setCredentials(current => ({ ...current, password: event.target.value }))} />
          <button type="button" className={styles.passwordToggle} onClick={() => setVisible(current => !current)} aria-label={visible ? "Hide password" : "Show password"} aria-controls="password" aria-pressed={visible}>{visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button>
        </div>
      </div>
      <TurnstileWidget action="login" onToken={setCaptchaToken} resetKey={state} />
      {state.error && <StatusMessage tone="error">{state.error}</StatusMessage>}
      <Button type="submit" data-login-primary className={styles.primary} disabled={pending}><span>{pending ? "Signing in…" : "Sign in"}</span><ArrowUpRight size={18} aria-hidden="true" /></Button>
      {emailOtpEnabled && <Link href={next ? `/login/code?next=${encodeURIComponent(next)}` : "/login/code"} className={styles.codeLink}>Sign in with an email code</Link>}
    </form>
    <div className={styles.google}><GoogleSignIn next={next} compact /></div>
    <p className={styles.signup}>New to AlumniKonneQt? <Link href="/signup">Create an account</Link></p>
  </LoginJourney>;
}
