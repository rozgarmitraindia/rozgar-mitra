import { Link } from "react-router-dom";
import { BadgeCheck, Building2, Mail, MapPin, Phone, ShieldCheck, UserRound } from "lucide-react";
import { getSession } from "../../utils/auth.js";
import { StatusPill } from "../../components/primitives/StatusPill.jsx";

function valueOf(value) {
  return value || "-";
}

export default function RoomOwnerProfile() {
  const session = getSession();
  const user = session?.user || session || {};
  const name = user.fullName || user.propertyName || session?.name || "Room Owner";
  const initial = name.charAt(0).toUpperCase();

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <div className="section-label">Room Owner Profile</div>
          <h1 className="section-title">Property Owner Details</h1>
          <p className="section-desc">Manage public trust details, owner identity, and property contact information from one clean profile.</p>
        </div>
        <Link className="btn-search" to="/room-owner/settings">Edit Settings</Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="form-card h-fit">
          <div className="flex items-center gap-4">
            <div className="grid size-16 place-items-center rounded-2xl bg-gradient-ink font-display text-2xl font-extrabold text-background">
              {initial}
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-display text-2xl font-bold">{name}</h2>
              <p className="section-desc">{user.immutableId || "Owner ID pending"}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <StatusPill status={user.status || "pending"} />
            {user.status === "verified" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-verified/10 px-3 py-1 text-xs font-extrabold text-foreground">
                <BadgeCheck size={14} className="text-verified" /> Verified owner
              </span>
            ) : null}
          </div>

          <div className="mt-6 grid gap-3">
            <QuickLine icon={Mail} label="Email" value={user.email} />
            <QuickLine icon={Phone} label="Phone" value={user.mobile || user.phone} />
            <QuickLine icon={MapPin} label="Location" value={user.propertyAddress || user.address} />
          </div>
        </aside>

        <div className="grid gap-5">
          <div className="form-card">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-gradient-signal text-signal-foreground"><Building2 size={20} /></span>
              <div>
                <div className="section-label">Property Summary</div>
                <h2 className="form-title mt-2">{valueOf(user.propertyName)}</h2>
              </div>
            </div>
            <p className="mt-4 detail-desc">{user.propertyDescription || user.about || "No property description available. Add a short, trustworthy property summary from settings."}</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <InfoCard icon={UserRound} title="Owner Information" rows={[
              ["Owner ID", user.immutableId],
              ["Name", name],
              ["Role", user.role || "roomOwner"],
              ["Status", user.status || "pending"],
            ]} />
            <InfoCard icon={ShieldCheck} title="Trust & Operations" rows={[
              ["Document status", user.status === "verified" ? "Verified" : "Pending review"],
              ["Preferred phone", user.mobile || user.phone],
              ["Contact email", user.email],
              ["Next step", "Post rooms, review visits, confirm bookings"],
            ]} />
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickLine({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4">
      <Icon size={18} className="mt-0.5 shrink-0 text-signal" />
      <div className="min-w-0">
        <div className="form-label">{label}</div>
        <div className="mt-1 break-words text-sm font-bold">{valueOf(value)}</div>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, title, rows }) {
  return (
    <div className="profile-card">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-gradient-signal text-signal-foreground"><Icon size={18} /></span>
        <h3 className="font-display text-lg font-bold">{title}</h3>
      </div>
      <div className="mt-5 grid gap-3">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-card p-3">
            <div className="form-label">{label}</div>
            <div className="mt-1 break-words text-sm font-bold">{valueOf(value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
