import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Building2, FileText, Mail, MapPin, Pencil, Phone, ShieldCheck } from "lucide-react";
import { apiFetch, getSession, setSession } from "../../utils/auth.js";

const signalLink = "inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-gradient-signal px-4 py-2 text-center text-sm font-semibold leading-snug text-signal-foreground shadow-float transition-all hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal";
const glassLink = "inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg glass px-4 py-2 text-center text-sm font-semibold leading-snug text-background transition-all hover:bg-background/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal";

export default function EmployerProfile() {
  const session = getSession();
  const [user, setUser] = useState(session?.user || session || {});

  useEffect(() => {
    let active = true;
    apiFetch("/user/me").then((result) => {
      const nextUser = result.data?.user || result.user;
      if (!active || !nextUser) return;
      setUser(nextUser);
      if (session?.token) setSession({ ...session, user: nextUser, role: nextUser.role || session.role }, localStorage.getItem("rozgar_session") !== null);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const documents = [...(user.companyDocs || []), ...(user.documents || [])];
  const status = user.status || "pending";

  return (
    <section className="bg-background">
      <div className="mesh-bg border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <ShieldCheck className="size-3.5 text-verified" />
                Company profile
              </div>
              <h1 className="mt-4 break-words font-display text-3xl font-bold leading-tight sm:text-4xl">{user.companyName || user.fullName || "Company profile"}</h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">Keep your hiring identity, verification documents and company contact details ready for admin review.</p>
            </div>
            <Link className={`${signalLink} w-full min-[520px]:w-auto`} to="/employer/settings"><Pencil className="size-4" />Edit profile</Link>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-float">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
            <div className="flex min-w-0 items-center gap-4">
              <div className="grid size-16 place-items-center rounded-2xl bg-gradient-ink font-display text-xl font-bold text-background">
                {(user.companyName || user.fullName || "RM").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="break-words font-display text-2xl font-bold">{user.companyName || user.fullName || "-"}</h2>
                <p className="mt-1 break-all text-sm text-muted-foreground">{user.immutableId || "Company ID pending"}</p>
              </div>
            </div>
            <span className="rounded-full border border-verified/30 bg-verified/10 px-3 py-1 text-xs font-semibold capitalize text-verified">{status}</span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Info icon={Mail} label="Company email" value={user.companyEmail || user.email} />
            <Info icon={Phone} label="Company phone" value={user.companyPhone || user.mobile || user.phone} />
            <Info icon={MapPin} label="Location" value={user.companyLocation || user.address} />
            <Info icon={Building2} label="Role" value={user.role || "employer"} />
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
            <h3 className="font-display text-lg font-semibold">About company</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{user.companyDescription || user.about || "No company description available."}</p>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-float">
            <div className="flex items-center gap-2">
              <BadgeCheck className="size-5 text-verified" />
              <h2 className="font-display text-xl font-bold">Verification desk</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Admin can review these documents before your jobs go live.</p>
            <div className="mt-5 grid gap-3">
              {documents.length ? documents.map((doc, index) => <DocumentLink key={`${doc.url}-${index}`} doc={doc} index={index} />) : <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">No company document found.</div>}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-gradient-ink p-6 text-background shadow-float">
            <h2 className="font-display text-xl font-bold">Hiring shortcuts</h2>
            <div className="mt-5 grid gap-3">
              <Link className={`${signalLink} w-full`} to="/post-job">Post job</Link>
              <Link className={`${glassLink} w-full`} to="/employer/applications">Review applicants</Link>
              <Link className={`${glassLink} w-full`} to="/employer/jobs">Manage jobs</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Icon className="size-4 text-signal" />{label}</div>
      <p className="mt-2 break-words text-sm font-semibold">{value || "-"}</p>
    </div>
  );
}

function DocumentLink({ doc, index }) {
  return (
    <a href={doc.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 text-sm font-semibold transition hover:border-signal hover:text-signal">
      <FileText className="size-5 text-signal" />
      <span className="min-w-0 break-words capitalize">{doc.originalName || doc.type || `Document ${index + 1}`}</span>
    </a>
  );
}
