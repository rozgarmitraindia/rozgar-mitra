import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, KeyRound, Lock, Mail, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button.jsx";
import { apiFetch } from "../utils/auth.js";

const steps = ["Email", "Verify OTP", "New password"];

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  async function run(path, body, nextStep, fallback) {
    setLoading(true); setError(""); setMessage("");
    try {
      const response = await apiFetch(path, { method: "POST", body: JSON.stringify(body) });
      setMessage(response.message || fallback);
      if (nextStep) setStep(nextStep);
      return true;
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      return false;
    } finally { setLoading(false); }
  }

  async function sendOtp() {
    if (await run("/auth/forgot-password", { email }, 2, "Reset OTP sent to your email.")) setCountdown(60);
  }

  async function resendOtp() {
    if (countdown > 0) return;
    if (await run("/auth/forgot-password", { email }, null, "OTP sent again.")) setCountdown(60);
  }

  return (
    <section className="mesh-bg min-h-[calc(100vh-8rem)] border-b border-border px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><ShieldCheck className="size-3.5 text-verified" /> Secure password recovery</div>
          <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight sm:text-5xl">Reset your password safely</h1>
          <p className="mt-4 max-w-xl leading-7 text-muted-foreground">Enter your registered email, verify the OTP, and create a new password for your account.</p>
          <div className="mt-7 max-w-xl rounded-2xl border border-signal/20 bg-signal/10 p-5">
            <div className="flex gap-3"><KeyRound className="mt-0.5 size-5 shrink-0 text-signal" /><div><h2 className="font-bold text-foreground">Important note</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">The OTP will be sent only to your registered email address. Never share your OTP or new password with anyone.</p></div></div>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-lift sm:p-8">
          <div className="mb-6 grid grid-cols-3 gap-2">
            {steps.map((label, index) => { const number = index + 1; const active = step >= number; return <div key={label} className={`rounded-xl border px-2 py-3 text-center text-xs font-bold ${active ? "border-signal/30 bg-signal/10 text-foreground" : "border-border bg-muted text-muted-foreground"}`}><span className="mb-1 block">{number}</span>{label}</div>; })}
          </div>
          {error && <div className="login-error" role="alert">{error}</div>}
          {message && step !== 4 && <div className="login-success" role="status">{message}</div>}

          {step === 1 && <form onSubmit={(event) => { event.preventDefault(); sendOtp(); }}>
            <h2 className="font-display text-2xl font-bold">Forgot password?</h2><p className="mt-2 text-sm text-muted-foreground">We will email you a 6-digit reset OTP.</p>
            <label className="mt-6 block text-sm font-semibold">Registered email address</label>
            <div className="relative mt-2"><Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input className="h-12 w-full rounded-xl border border-border bg-muted px-3 pl-10 text-sm outline-none transition focus:ring-2 focus:ring-signal" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@example.com" autoComplete="email" required /></div>
            <Button className="mt-6 w-full" variant="signal" size="xl" disabled={loading}>{loading ? "Sending OTP..." : "Send Reset OTP"}</Button>
          </form>}

          {step === 2 && <form onSubmit={async (event) => { event.preventDefault(); await run("/auth/verify-reset-otp", { email, otp }, 3, "OTP verified successfully."); }}>
            <h2 className="font-display text-2xl font-bold">Verify your email</h2><p className="mt-2 text-sm text-muted-foreground">Enter the OTP sent to <strong className="text-foreground">{email}</strong>.</p>
            <label className="mt-6 block text-sm font-semibold">6-digit OTP</label>
            <input className="mt-2 h-12 w-full rounded-xl border border-border bg-muted px-4 text-center text-lg font-bold tracking-[0.35em] outline-none transition focus:ring-2 focus:ring-signal" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="000000" required />
            <Button className="mt-6 w-full" variant="signal" size="xl" disabled={loading || otp.length !== 6}>{loading ? "Verifying..." : "Verify OTP"}</Button>
            <Button className="mt-3 w-full" variant="outline" size="xl" type="button" disabled={loading || countdown > 0} onClick={resendOtp}>{countdown > 0 ? `Resend OTP in ${countdown}s` : "Resend OTP"}</Button>
          </form>}

          {step === 3 && <form onSubmit={async (event) => { event.preventDefault(); await run("/auth/reset-password", { email, otp, password }, 4, "Password reset successfully."); }}>
            <h2 className="font-display text-2xl font-bold">Create new password</h2><p className="mt-2 text-sm text-muted-foreground">Choose a strong password with at least 8 characters.</p>
            <label className="mt-6 block text-sm font-semibold">New password</label>
            <div className="relative mt-2"><Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input className="h-12 w-full rounded-xl border border-border bg-muted px-3 pl-10 text-sm outline-none transition focus:ring-2 focus:ring-signal" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength="8" autoComplete="new-password" placeholder="Minimum 8 characters" required /></div>
            <Button className="mt-6 w-full" variant="signal" size="xl" disabled={loading || password.length < 8}>{loading ? "Updating..." : "Set New Password"}</Button>
          </form>}

          {step === 4 && <div className="py-4 text-center"><CheckCircle2 className="mx-auto size-14 text-verified" /><h2 className="mt-4 font-display text-2xl font-bold">Password updated</h2><p className="mt-2 text-sm text-muted-foreground">{message || "Your password has been reset successfully."}</p><Button className="mt-6 w-full" variant="signal" size="xl" onClick={() => navigate("/login")}>Go to Login</Button></div>}
          {step !== 4 && <Link className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-signal" to="/login"><ArrowLeft className="size-4" /> Back to Login</Link>}
        </div>
      </div>
    </section>
  );
}
