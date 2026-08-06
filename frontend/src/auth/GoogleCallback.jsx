import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setSession } from "../utils/auth.js";
import { useToast } from "../contexts/ToastContext.jsx";

export default function GoogleCallback() {
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const refreshToken = params.get("refreshToken");
    const user = params.get("user");
    const redirectTo = params.get("redirectTo") || "/";
    const error = params.get("error");

    if (error) {
      toast.show(error, "error");
      setTimeout(() => navigate("/login", { replace: true, state: { error } }), 900);
      return;
    }

    if (token && refreshToken && user) {
      try {
        const parsed = JSON.parse(user);
        setSession({ token, refreshToken, user: parsed, role: parsed.role });
        toast.show("Signed in with Google", "success");
      } catch {
        setSession({ token, refreshToken, user: null, role: null });
        toast.show("Signed in, but failed to parse profile", "info");
      }
      setTimeout(() => navigate(redirectTo, { replace: true }), 800);
      return;
    }
    toast.show("Google login failed", "error");
    setTimeout(() => navigate("/login", { replace: true, state: { error: "Google login failed" } }), 1500);
  }, [navigate, toast]);

  return (
    <section className="form-page">
      <div className="section-header">
        <div className="section-label">Google Login</div>
        <h1 className="section-title">Signing you in</h1>
        <p className="section-desc">Please wait while we complete your Google sign-in.</p>
      </div>
    </section>
  );
}
