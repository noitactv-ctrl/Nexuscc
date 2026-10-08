import { useState } from "react";
import { Link, Redirect, useLocation } from "wouter";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { CaptchaChallenge, useCaptcha } from "@/components/auth/CaptchaChallenge";
import { SpiderBrand, SpiderFooter } from "@/components/auth/AuthChrome";

function PasswordField({ value, onChange, placeholder, autoComplete, disabled }: {
  value: string; onChange: (value: string) => void; placeholder: string;
  autoComplete: string; disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return <div className="spider-password-field">
    <input className="spider-input" type={visible ? "text" : "password"} value={value}
      onChange={(event) => onChange(event.target.value)} placeholder={placeholder}
      autoComplete={autoComplete} disabled={disabled} required />
    <button className="spider-password-toggle" type="button" aria-label="Toggle password visibility"
      onClick={() => setVisible((current) => !current)}>
      {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
    </button>
  </div>;
}

function LoginForm({ onRegister }: { onRegister: () => void }) {
  const { login, isLoggingIn } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [captchaInput, setCaptchaInput] = useState("");
  const { code, tick, refresh } = useCaptcha();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (captchaInput.trim().toLowerCase() !== code.toLowerCase()) {
      toast({ title: "Verification failed", description: "The code does not match.", variant: "destructive" });
      refresh(); setCaptchaInput(""); return;
    }
    try { await login({ email: email.trim().toLowerCase(), password, rememberMe }); } catch { /* auth hook reports errors */ }
  }
  return <>
    <header className="spider-auth-heading"><h1>Login to your account</h1><p>Enter your email below to login to your account</p></header>
    <form className="spider-form" onSubmit={submit}>
      <div className="spider-field"><label className="spider-field-label">Email <span>*</span></label>
        <input className="spider-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email" autoComplete="email" required disabled={isLoggingIn} /></div>
      <div className="spider-field"><label className="spider-field-label">Password <span>*</span></label>
        <PasswordField value={password} onChange={setPassword} placeholder="Enter your password"
          autoComplete="current-password" disabled={isLoggingIn} /></div>
      <div className="spider-login-options">
        <label className="spider-checkbox-label"><input type="checkbox" checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)} /><span>Remember me</span></label>
        <Link href="/forgot-password"><a className="spider-muted-link">Forgot password</a></Link>
      </div>
      <CaptchaChallenge code={code} tick={tick} value={captchaInput} onChange={setCaptchaInput}
        onRefresh={() => { refresh(); setCaptchaInput(""); }} disabled={isLoggingIn} />
      <button className="spider-primary-button" type="submit" disabled={isLoggingIn || !email || !password || !captchaInput}>
        {isLoggingIn && <Loader2 className="h-4 w-4 animate-spin" />}Login
      </button>
    </form>
    <p className="spider-auth-switch">Don&apos;t have an account? <button type="button" onClick={onRegister}>Sign up</button></p>
  </>;
}

function RegisterForm({ onLogin }: { onLogin: () => void }) {
  const { register, isRegistering } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [captchaInput, setCaptchaInput] = useState("");
  const { code, tick, refresh } = useCaptcha();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirm || password.length < 12 || !agreed) {
      toast({ title: password !== confirm ? "Passwords do not match" : "Check password length and accept the terms.", variant: "destructive" });
      return;
    }
    if (captchaInput.trim().toLowerCase() !== code.toLowerCase()) {
      toast({ title: "Verification failed", description: "The code does not match.", variant: "destructive" });
      refresh(); setCaptchaInput(""); return;
    }
    try { await register({ email: email.trim().toLowerCase(), password, agreedToTerms: true }); } catch { /* auth hook reports errors */ }
  }
  return <>
    <header className="spider-auth-heading"><h1>Create your account</h1><p>Enter your information to create a new account</p></header>
    <form className="spider-form spider-register-form" onSubmit={submit}>
      <div className="spider-field"><label className="spider-field-label">Email <span>*</span></label>
        <input className="spider-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email" autoComplete="email" required disabled={isRegistering} /></div>
      <div className="spider-field"><label className="spider-field-label">Password <span>*</span></label>
        <PasswordField value={password} onChange={setPassword} placeholder="Enter your password" autoComplete="new-password" disabled={isRegistering} /></div>
      <div className="spider-field"><label className="spider-field-label">Confirm Password <span>*</span></label>
        <PasswordField value={confirm} onChange={setConfirm} placeholder="Confirm your password" autoComplete="new-password" disabled={isRegistering} /></div>
      <label className="spider-terms-consent"><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} required />
        <span>I accept <Link href="/terms"><a>Terms</a></Link> &amp; <Link href="/privacy"><a>Privacy</a></Link> *</span></label>
      <CaptchaChallenge code={code} tick={tick} value={captchaInput} onChange={setCaptchaInput}
        onRefresh={() => { refresh(); setCaptchaInput(""); }} disabled={isRegistering} />
      <button className="spider-primary-button" type="submit" disabled={isRegistering || !email || !password || !confirm || !agreed || !captchaInput}>
        {isRegistering && <Loader2 className="h-4 w-4 animate-spin" />}Create Account
      </button>
    </form>
    <p className="spider-auth-switch">Already have an account? <button type="button" onClick={onLogin}>Sign in</button></p>
  </>;
}

export default function AuthPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<"login" | "register">(() =>
    new URLSearchParams(window.location.search).get("mode") === "register" ? "register" : "login");
  if (user) return <Redirect to="/" />;
  const changeTab = (next: "login" | "register") => {
    setTab(next); setLocation(next === "register" ? "/auth?mode=register" : "/auth");
  };
  return <main className={`spider-entry-page ${tab === "login" ? "spider-login-page" : "spider-register-page"}`}>
    <section className={`spider-entry-content ${tab === "login" ? "spider-login-card" : "spider-register-content"}`}>
      <SpiderBrand />
      {tab === "login" ? <LoginForm onRegister={() => changeTab("register")} /> : <RegisterForm onLogin={() => changeTab("login")} />}
      <SpiderFooter className="spider-entry-footer" />
    </section>
  </main>;
}
