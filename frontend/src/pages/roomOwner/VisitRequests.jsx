import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, CheckCircle2, ExternalLink, Home, Phone, RefreshCw, UserRound, Users, X } from "lucide-react";
import { fetchRoomOwnerVisitRequests, respondToVisitRequest } from "./roomOwnerApi.js";
import { useToast } from "../../contexts/ToastContext.jsx";
import { cn } from "../../lib/utils.js";

function displayDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleDateString("en-IN");
}

function ageFromDob(dateOfBirth) {
  if (!dateOfBirth) return "-";
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.valueOf())) return "-";
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  if (today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) age -= 1;
  return age >= 0 ? `${age} years` : "-";
}

function roomId(room) {
  return room?.publicId || room?.roomId || room?._id || "-";
}

function visitStatus(item) {
  return item.visitStatus || item.status || "pending";
}

function statusClass(status) {
  if (status === "confirmed" || status === "completed") return "bg-verified/10 text-foreground border-verified/30";
  if (status === "rejected" || status === "cancelled") return "bg-destructive/10 text-destructive border-destructive/25";
  return "bg-signal/15 text-foreground border-signal/35";
}

export default function VisitRequests() {
  const [requests, setRequests] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const toast = useToast();

  const metrics = useMemo(() => {
    const count = (status) => requests.filter((item) => visitStatus(item) === status).length;
    return [
      { label: "Pending", value: count("pending") },
      { label: "Confirmed", value: count("confirmed") },
      { label: "Completed", value: count("completed") },
      { label: "Rejected", value: count("rejected") },
    ];
  }, [requests]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setRequests(await fetchRoomOwnerVisitRequests());
    } catch (err) {
      setError(err.message || "Unable to load requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleResponse(requestId, action) {
    setActionLoading(requestId);
    try {
      await respondToVisitRequest(requestId, { action });
      toast.show(action === "complete" ? "Visit completed. Booking unlocked." : `Request ${action}ed`, "success");
      await load();
    } catch (err) {
      toast.show(err.message || "Unable to update request.", "error");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <div className="section-label">Visit Requests</div>
          <h1 className="section-title">Visit Review Desk</h1>
          <p className="section-desc">Candidate profile, room ID, visit slot, and approval workflow in one responsive owner view.</p>
        </div>
        <button className="btn-secondary room-owner-header-action" type="button" onClick={load} disabled={loading}><RefreshCw size={16} />Refresh</button>
      </div>

      {error ? <div className="login-error">{error}</div> : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="dashboard-card dashboard-card-small">
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </div>
        ))}
      </div>

      <div className="grid gap-4">
        {loading ? <div className="form-card text-muted-foreground">Loading visit requests...</div> : null}
        {!loading && requests.length ? requests.map((item) => (
          <VisitCard
            key={item._id}
            item={item}
            busy={actionLoading === item._id}
            onCandidate={() => setSelectedCandidate(item.user)}
            onAction={(action) => handleResponse(item._id, action)}
          />
        )) : null}
        {!loading && !requests.length ? (
          <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center shadow-float">
            <CalendarClock className="mx-auto size-10 text-signal" />
            <h2 className="mt-4 font-display text-2xl font-bold">No visit requests yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">New candidate visit requests will appear here with room ID and profile details.</p>
          </div>
        ) : null}
      </div>

      {selectedCandidate ? <CandidateModal candidate={selectedCandidate} onClose={() => setSelectedCandidate(null)} /> : null}
    </section>
  );
}

function VisitCard({ item, busy, onCandidate, onAction }) {
  const status = visitStatus(item);
  const room = item.room || {};
  const user = item.user || {};
  const occupancyLeft = Number(room.availableOccupancy ?? room.maxOccupancy ?? 0);
  const canAccept = status === "pending";
  const canComplete = status === "confirmed";

  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-float transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="grid gap-5 p-5 lg:grid-cols-[1.1fr_1fr_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full border px-3 py-1 text-xs font-extrabold capitalize", statusClass(status))}>{status}</span>
            <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-bold text-muted-foreground">Requested {displayDate(item.createdAt)}</span>
          </div>
          <button className="mt-4 flex max-w-full items-center gap-3 text-left" type="button" onClick={onCandidate}>
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-signal font-display font-extrabold text-signal-foreground">
              {(user.fullName || user.email || "C").charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-xl font-bold">{user.fullName || user.email || "Candidate"}</span>
              <span className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1"><UserRound size={14} className="text-signal" />{user.immutableId || user._id || "-"}</span>
                <span className="inline-flex items-center gap-1"><Phone size={14} className="text-signal" />{user.mobile || user.phone || "-"}</span>
              </span>
            </span>
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-ink text-background"><Home size={18} /></span>
            <div className="min-w-0">
              <Link className="inline-flex items-center gap-1 font-display text-lg font-bold hover:text-signal" to={`/post-room?roomId=${room._id}`}>
                {roomId(room)} <ExternalLink size={14} />
              </Link>
              <p className="mt-1 truncate text-sm font-semibold">{room.propertyName || room.title || "Room"}</p>
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Users size={14} className="text-signal" />{occupancyLeft} occupancy left</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-border bg-card p-3 text-sm">
            <div className="form-label">Visit Slot</div>
            <div className="mt-1 font-bold">{[item.visitDate || "Date not selected", item.visitTime || "Time not selected"].join(" | ")}</div>
          </div>
        </div>

        <div className="room-owner-action-grid lg:max-w-[260px] lg:justify-end">
          <button className="btn-secondary" type="button" disabled={busy || !canAccept} onClick={() => onAction("accept")}>Accept</button>
          <button className="btn-danger" type="button" disabled={busy || !canAccept} onClick={() => onAction("reject")}>Reject</button>
          <button className="btn-primary" type="button" disabled={busy || !canComplete} onClick={() => onAction("complete")}><CheckCircle2 size={16} />Mark Visit Complete</button>
        </div>
      </div>
    </article>
  );
}

function CandidateModal({ candidate, onClose }) {
  const docs = [candidate.profilePhoto, candidate.resume, ...(candidate.documents || [])].filter(Boolean);
  return (
    <div className="document-modal room-owner-scroll-modal" onMouseDown={onClose}>
      <section className="document-modal-card admin-edit-modal room-owner-modal-card" onMouseDown={(event) => event.stopPropagation()}>
        <div className="document-modal-head">
          <div>
            <strong>{candidate.fullName || "Candidate Profile"}</strong>
            <span>{candidate.immutableId || candidate.email}</span>
          </div>
          <button className="document-close" type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="admin-edit-grid">
          <Bio label="Name" value={candidate.fullName} />
          <Bio label="Candidate ID" value={candidate.immutableId || candidate._id} />
          <Bio label="Email" value={candidate.email} />
          <Bio label="Mobile" value={candidate.mobile || candidate.phone} />
          <Bio label="DOB" value={displayDate(candidate.dateOfBirth)} />
          <Bio label="Age" value={ageFromDob(candidate.dateOfBirth)} />
          <Bio label="Gender" value={candidate.gender} />
          <Bio label="Address" value={candidate.address} />
          <Bio label="Pincode" value={candidate.pincode} />
          <Bio label="Skills" value={(candidate.skills || []).join(", ")} />
          <Bio label="Experience" value={candidate.experience || `${candidate.workExperienceMonths || 0} months`} />
          <Bio label="Availability" value={candidate.availability} />
          <Bio label="About" value={candidate.about} wide />
        </div>
        <h3 className="form-title admin-section-title">Documents</h3>
        <div className="admin-doc-grid">
          {docs.length ? docs.map((doc, index) => <a key={doc.url || index} className="admin-doc" href={doc.url || doc} target="_blank" rel="noreferrer"><span className="admin-doc-icon">DOC</span><b>{doc.label || doc.type || `Document ${index + 1}`}</b><span>Open preview</span></a>) : <p className="section-desc">No documents uploaded.</p>}
        </div>
      </section>
    </div>
  );
}

function Bio({ label, value, wide = false }) {
  if (!value) return null;
  return (
    <div className={wide ? "form-group admin-edit-wide" : "form-group"}>
      <span className="form-label">{label}</span>
      <div className="detail-desc">{value}</div>
    </div>
  );
}
