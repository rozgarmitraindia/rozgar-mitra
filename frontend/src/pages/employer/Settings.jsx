import { useState } from "react";
import { Building2, FileText, Loader2, Mail, MapPin, Phone, Save } from "lucide-react";
import { apiFetch, getSession, setSession } from "../../utils/auth.js";
import { useToast } from "../../contexts/ToastContext.jsx";
import { Button } from "../../components/ui/button.jsx";

export default function EmployerSettings() {
  const session = getSession();
  const user = session?.user || session || {};
  const [form, setForm] = useState({
    companyName: user.companyName || user.fullName || "",
    companyEmail: user.companyEmail || user.email || "",
    companyPhone: user.companyPhone || user.mobile || "",
    companyLocation: user.companyLocation || user.address || "",
    googleMapLink: user.googleMapLink || "",
    about: user.companyDescription || user.about || "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const toast = useToast();

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function handleSave(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const result = await apiFetch("/user/profile", {
        method: "PATCH",
        body: JSON.stringify({
          fullName: form.companyName,
          email: form.companyEmail,
          mobile: form.companyPhone,
          companyName: form.companyName,
          companyEmail: form.companyEmail,
          companyPhone: form.companyPhone,
          companyLocation: form.companyLocation,
          address: form.companyLocation,
          googleMapLink: form.googleMapLink,
          about: form.about,
        }),
      });
      const nextUser = result.data?.user || result.user;
      if (nextUser && session?.token) {
        setSession({ ...session, user: nextUser, role: nextUser.role || session.role }, localStorage.getItem("rozgar_session") !== null);
      }
      setMessage("Employer settings updated successfully.");
      toast.show("Employer settings updated", "success");
    } catch (err) {
      setError(err.message || "Unable to save settings.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-background">
      <div className="mesh-bg border-b border-border">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <div className="inline-flex rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Employer settings</div>
          <h1 className="mt-4 font-display text-4xl font-bold">Company account details</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Update the public contact and verification profile used in your job posts and employer dashboard.</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <form className="rounded-2xl border border-border bg-card p-6 shadow-float" onSubmit={handleSave}>
          {error ? <div className="mb-5 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-semibold text-destructive">{error}</div> : null}
          {message ? <div className="mb-5 rounded-xl border border-verified/20 bg-verified/10 p-4 text-sm font-semibold text-verified">{message}</div> : null}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field icon={Building2} label="Company name" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="PulseIQ Support Services" required />
            <Field icon={Mail} label="Company email" type="email" value={form.companyEmail} onChange={(e) => set("companyEmail", e.target.value)} placeholder="hr@company.com" required />
            <Field icon={Phone} label="Company phone" value={form.companyPhone} onChange={(e) => set("companyPhone", e.target.value)} placeholder="+91 98765 43210" />
            <Field icon={MapPin} label="Location" value={form.companyLocation} onChange={(e) => set("companyLocation", e.target.value)} placeholder="Noida, Uttar Pradesh" />
            <Field icon={MapPin} label="Google Maps link" type="url" value={form.googleMapLink} onChange={(e) => set("googleMapLink", e.target.value)} placeholder="https://maps.google.com/..." className="sm:col-span-2" />
            <Field icon={FileText} label="About company" as="textarea" value={form.about} onChange={(e) => set("about", e.target.value)} placeholder="Write a short company overview for candidates and admin verification." className="sm:col-span-2" rows={5} />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            <p className="text-sm text-muted-foreground">Changing email may require verification again.</p>
            <Button variant="signal" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {loading ? "Saving..." : "Save settings"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}

function Field({ icon: Icon, label, as, className = "", ...props }) {
  const Comp = as || "input";
  return (
    <label className={className}>
      <span className="flex items-center gap-2 text-sm font-semibold"><Icon className="size-4 text-signal" />{label}</span>
      <Comp className="mt-2 min-h-11 w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-signal" {...props} />
    </label>
  );
}
