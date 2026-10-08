import { FormEvent, useState } from "react";
import { Link, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { SpiderBrand, SpiderFooter } from "@/components/auth/AuthChrome";
import { CaptchaChallenge, useCaptcha } from "@/components/auth/CaptchaChallenge";

function RecoveryShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="spider-recovery-page">
      <div className="spider-recovery-shell">
        <SpiderBrand />
        {children}
        <SpiderFooter className="spider-recovery-footer" />
      </div>
    </main>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const { code, tick, refresh } = useCaptcha();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (captchaInput.trim().toLowerCase() !== code.toLowerCase()) {
      setError("The verification code does not match. Try again.");
      refresh();
      setCaptchaInput("");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "We couldn’t send a reset link right now. Please try again later.");
      setSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn’t send a reset link right now. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RecoveryShell>
      <header className="spider-recovery-heading">
        <h1>Forgot your password?</h1>
        <p>Enter your email address and we&apos;ll send you a link to reset your password</p>
      </header>

      {sent ? (
        <div className="spider-recovery-success" role="status">
          <span className="spider-success-icon" aria-hidden="true">✓</span>
          <div>
            <h2>Check your email</h2>
            <p>If an account exists for <strong>{email}</strong>, a password reset link is on its way.</p>
          </div>
        </div>
      ) : (
        <form className="spider-form spider-recovery-form" onSubmit={submit}>
          <div className="spider-field">
            <label className="spider-field-label" htmlFor="recovery-email">
              Email <span aria-hidden="true">*</span>
            </label>
            <input
              id="recovery-email"
              className="spider-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email address"
              autoComplete="email"
              required
              disabled={submitting}
            />
          </div>

          <CaptchaChallenge
            code={code}
            tick={tick}
            value={captchaInput}
            onChange={setCaptchaInput}
            onRefresh={() => {
              refresh();
              setCaptchaInput("");
            }}
            disabled={submitting}
          />

          {error && <p className="spider-form-error" role="alert">{error}</p>}
          <button className="spider-primary-button" type="submit" disabled={submitting || !email.trim() || !captchaInput.trim()}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Send Reset Link
          </button>
        </form>
      )}

      <p className="spider-auth-switch spider-recovery-switch">
        Remember your password? <Link href="/auth">Back to sign in</Link>
      </p>
    </RecoveryShell>
  );
}

export function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Your passwords do not match.");
      return;
    }
    if (password.length < 12) {
      setError("Use at least 12 characters for your new password.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "This reset link is invalid or has expired.");
      setDone(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This reset link is invalid or has expired.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RecoveryShell>
      <header className="spider-recovery-heading">
        <h1>Choose a new password</h1>
        <p>Use at least 12 characters to protect your account.</p>
      </header>

      {done ? (
        <div className="spider-recovery-success" role="status">
          <span className="spider-success-icon" aria-hidden="true">✓</span>
          <div>
            <h2>Password updated</h2>
            <p>Your password has been changed. You can sign in with it now.</p>
          </div>
        </div>
      ) : (
        <form className="spider-form spider-recovery-form" onSubmit={submit}>
          <div className="spider-field">
            <label className="spider-field-label" htmlFor="new-password">New password <span aria-hidden="true">*</span></label>
            <input
              id="new-password"
              className="spider-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter a new password"
              autoComplete="new-password"
              required
              minLength={12}
              disabled={submitting || !token}
            />
          </div>
          <div className="spider-field">
            <label className="spider-field-label" htmlFor="confirm-password">Confirm password <span aria-hidden="true">*</span></label>
            <input
              id="confirm-password"
              className="spider-input"
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              placeholder="Confirm your new password"
              autoComplete="new-password"
              required
              minLength={12}
              disabled={submitting || !token}
            />
          </div>
          {!token && <p className="spider-form-error" role="alert">This reset link is missing its token. Request a new link.</p>}
          {error && <p className="spider-form-error" role="alert">{error}</p>}
          <button className="spider-primary-button" type="submit" disabled={submitting || !token || !password || !confirm}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Reset Password
          </button>
        </form>
      )}

      <p className="spider-auth-switch spider-recovery-switch">
        <button type="button" onClick={() => setLocation("/auth")}>Back to sign in</button>
      </p>
    </RecoveryShell>
  );
}
