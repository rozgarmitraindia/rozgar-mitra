import { useEffect, useMemo, useState } from "react";
import { CalendarCheck2, CheckCircle2, Download, ExternalLink, FileText, ImageIcon, RefreshCw, Users, X } from "lucide-react";
import { useToast } from "../../contexts/ToastContext.jsx";
import { fetchEmployerApplications, fireApplicant, hireApplicant, interviewApplicant, rejectApplicant, shortlistApplicant } from "./employerApi.js";
import { Button } from "../../components/ui/button.jsx";
import { cn } from "../../lib/utils.js";

const statuses = ["all", "submitted", "shortlisted", "interview", "hired", "terminated", "rejected"];
const emptyInterview = { mode: "remote", hrName: "", date: "", time: "", meetingUrl: "", mapLink: "", locationAddress: "", supportContact: "" };

function candidateAge(dateOfBirth) {
  if (!dateOfBirth) return "-";
  const date = new Date(dateOfBirth);
  let age = new Date().getFullYear() - date.getFullYear();
  if (new Date().getMonth() < date.getMonth() || (new Date().getMonth() === date.getMonth() && new Date().getDate() < date.getDate())) age -= 1;
  return `${age} years`;
}

function getDocUrl(doc) {
  return typeof doc === "string" ? doc : doc?.url;
}

function isImageDocument(doc, label = "") {
  const url = getDocUrl(doc) || "";
  const mimeType = typeof doc === "string" ? "" : doc?.mimeType || "";
  return mimeType.startsWith("image/") || /\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i.test(url) || /profile photo|image|logo/i.test(label);
}

function isPdfDocument(doc, label = "") {
  const url = getDocUrl(doc) || "";
  const mimeType = typeof doc === "string" ? "" : doc?.mimeType || "";
  return mimeType === "application/pdf" || /\.pdf(\?.*)?$/i.test(url) || /pdf|government|document|resume|id|aadhaar|proof/i.test(label);
}

function mergeDocLinks(entries) {
  const seen = new Set();
  return entries.filter((item) => {
    const url = getDocUrl(item.doc);
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

export default function EmployerApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [interviewTargets, setInterviewTargets] = useState([]);
  const [interview, setInterview] = useState(emptyInterview);
  const toast = useToast();

  async function load() {
    setLoading(true);
    setError("");
    try {
      setApplications(await fetchEmployerApplications());
    } catch (err) {
      setError(err.message || "Unable to load applications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => status === "all" ? applications : applications.filter((item) => item.status === status), [applications, status]);
  const selectable = useMemo(() => filtered.filter((item) => !["hired", "rejected"].includes(item.status)), [filtered]);
  const selectedApplications = useMemo(() => selectable.filter((item) => selectedIds.includes(item._id)), [selectable, selectedIds]);
  const updateItem = (next) => setApplications((items) => items.map((item) => item._id === next._id ? next : item));

  function toggleSelected(id) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleAllSelected() {
    const ids = selectable.map((item) => item._id);
    setSelectedIds((current) => current.length === ids.length ? [] : ids);
  }

  function openInterviewWindow(targets) {
    const nextTargets = Array.isArray(targets) ? targets : [targets];
    if (!nextTargets.length) return;
    setInterviewTargets(nextTargets);
    setInterview(nextTargets.length === 1 ? (nextTargets[0].interview || emptyInterview) : emptyInterview);
  }

  async function doAction(item, action) {
    setActionLoading(`${action}:${item._id}`);
    try {
      let result;
      if (action === "shortlist") result = await shortlistApplicant(item._id);
      if (action === "hire") result = await hireApplicant(item._id, {});
      if (action === "fire") {
        const reason = window.prompt("Termination reason for candidate");
        if (!reason?.trim()) return;
        result = await fireApplicant(item._id, { reason: reason.trim() });
      }
      if (action === "reject") {
        const reason = window.prompt("Professional rejection reason for candidate");
        if (!reason?.trim()) return;
        result = await rejectApplicant(item._id, { reason: reason.trim() });
      }
      const next = result.data?.application || result.application;
      if (next) updateItem(next);
      toast.show(result.message || "Application updated", "success");
    } catch (err) {
      toast.show(err.message || "Unable to update application", "error");
    } finally {
      setActionLoading("");
    }
  }

  async function scheduleInterview(event) {
    event.preventDefault();
    if (!interviewTargets.length) return;
    setActionLoading(`interview:${interviewTargets.map((item) => item._id).join(",")}`);
    try {
      const results = await Promise.all(interviewTargets.map((item) => interviewApplicant(item._id, interview)));
      results.forEach((result) => {
        const next = result.data?.application || result.application;
        if (next) updateItem(next);
      });
      toast.show(`Interview scheduled for ${interviewTargets.length} candidate${interviewTargets.length > 1 ? "s" : ""}. Email, web and push notifications sent.`, "success");
      setSelectedIds([]);
      setInterviewTargets([]);
      setInterview(emptyInterview);
    } catch (err) {
      toast.show(err.message || "Unable to schedule interview", "error");
    } finally {
      setActionLoading("");
    }
  }

  return (
    <section className="bg-background">
      <div className="mesh-bg border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Hiring workspace</div>
              <h1 className="mt-4 font-display text-4xl font-bold">Applicants & interviews</h1>
              <p className="mt-2 text-muted-foreground">Review biodata, government ID, resume, uploaded documents and schedule interviews.</p>
            </div>
            <Button variant="outline" onClick={load}><RefreshCw className="size-4" />Refresh</Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {error ? <div className="mb-6 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-semibold text-destructive">{error}</div> : null}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {statuses.map((item) => (
              <button key={item} type="button" className={cn("rounded-full border px-3.5 py-1.5 text-xs font-semibold capitalize transition", status === item ? "border-signal bg-signal/15 text-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground")} onClick={() => { setStatus(item); setSelectedIds([]); }}>
                {item === "all" ? "All applicants" : item}
              </button>
            ))}
          </div>
          {selectedApplications.length ? (
            <Button variant="signal" onClick={() => openInterviewWindow(selectedApplications)}>
              <CalendarCheck2 className="size-4" />
              Schedule selected ({selectedApplications.length})
            </Button>
          ) : null}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-float">
          <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">
                  <input className="size-4 accent-signal" type="checkbox" checked={selectable.length > 0 && selectedIds.length === selectable.length} onChange={toggleAllSelected} aria-label="Select all applicants" />
                </th>
                <th className="px-4 py-3 font-semibold">Candidate</th>
                <th className="px-4 py-3 font-semibold">Job</th>
                <th className="px-4 py-3 font-semibold">Profile</th>
                <th className="px-4 py-3 font-semibold">Documents</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td className="px-4 py-6 text-muted-foreground" colSpan="7">Loading applicants...</td></tr> : null}
              {!loading && filtered.length ? filtered.map((item) => {
                const busy = Boolean(actionLoading);
                const closed = ["hired", "terminated", "rejected"].includes(item.status);
                const documents = mergeDocLinks([
                  { doc: item.governmentIdDocument || item.governmentIdUrl },
                  { doc: item.candidateResumeDocument || item.candidateResumeUrl },
                  ...(item.applicationDocuments || []).map((doc) => ({ doc })),
                  ...(item.candidateDocuments || []).map((doc) => ({ doc })),
                  ...((item.candidate?.documents || []).map((doc) => ({ doc }))),
                ]);
                return (
                  <tr key={item._id} className="border-t border-border">
                    <td className="px-4 py-4">
                      <input className="size-4 accent-signal disabled:opacity-40" type="checkbox" checked={selectedIds.includes(item._id)} disabled={closed} onChange={() => toggleSelected(item._id)} aria-label={`Select ${item.candidate?.fullName || "candidate"}`} />
                    </td>
                    <td className="px-4 py-4"><b>{item.candidate?.fullName || "Candidate"}</b><br /><small className="text-muted-foreground">{item.candidate?.email}</small></td>
                    <td className="px-4 py-4">{item.job?.title || "Job removed"}</td>
                    <td className="px-4 py-4 text-muted-foreground">{candidateAge(item.candidate?.dateOfBirth)} - {item.candidate?.gender || "Not shared"}</td>
                    <td className="px-4 py-4 text-muted-foreground">{documents.length} files</td>
                    <td className="px-4 py-4"><span className="rounded-full bg-verified/15 px-2.5 py-0.5 text-xs font-semibold capitalize text-verified">{item.status}</span></td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelected(item)}>View bio</Button>
                        <Button variant="outline" size="sm" disabled={busy || closed} onClick={() => doAction(item, "shortlist")}>Shortlist</Button>
                        <Button variant="signal" size="sm" disabled={busy || closed} onClick={() => openInterviewWindow(item)}>Interview</Button>
                        <Button variant="signal" size="sm" disabled={busy || closed} onClick={() => doAction(item, "hire")}>Hire</Button>
                        {item.status === "hired" ? <Button variant="outline" size="sm" disabled={busy} onClick={() => doAction(item, "fire")}>Fire</Button> : null}
                        <Button variant="outline" size="sm" disabled={busy || closed} onClick={() => doAction(item, "reject")}>Reject</Button>
                      </div>
                    </td>
                  </tr>
                );
              }) : null}
              {!loading && !filtered.length ? <tr><td className="px-4 py-6 text-muted-foreground" colSpan="7">No applications in this status.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>

      {selected ? <CandidateModal item={selected} onClose={() => setSelected(null)} /> : null}
      {interviewTargets.length ? <InterviewModal items={interviewTargets} value={interview} onChange={setInterview} onClose={() => setInterviewTargets([])} onSubmit={scheduleInterview} loading={actionLoading.startsWith("interview:")} /> : null}
    </section>
  );
}

function CandidateModal({ item, onClose }) {
  const candidate = item.candidate || {};
  const documents = mergeDocLinks([
    { label: "Profile Photo", doc: candidate.profilePhoto || item.candidateProfilePhotoUrl },
    { label: "Profile Resume", doc: candidate.resume || item.candidateResumeUrl },
    { label: "Application Government ID", doc: item.governmentIdDocument || item.governmentIdUrl },
    { label: "Application Resume", doc: item.candidateResumeDocument || item.candidateResumeUrl },
    ...(item.applicationDocuments || []).map((doc, index) => ({ label: doc.type || `Application Document ${index + 1}`, doc })),
    ...(item.candidateDocuments || []).map((doc, index) => ({ label: doc.type || `Candidate Snapshot ${index + 1}`, doc })),
    ...(candidate.documents || []).map((doc, index) => ({ label: doc.type || `Profile Document ${index + 1}`, doc })),
  ]);

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-foreground/45 p-4" onMouseDown={onClose}>
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-lift" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Candidate profile</div>
            <h2 className="mt-1 font-display text-2xl font-bold">{candidate.fullName || "Candidate"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{candidate.email || "-"} - {candidate.mobile || "-"}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="size-5" /></Button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Bio label="Form Submit ID" value={item._id} />
          <Bio label="Candidate ID" value={candidate.immutableId || candidate._id} />
          <Bio label="Age" value={candidateAge(candidate.dateOfBirth)} />
          <Bio label="Date of birth" value={candidate.dateOfBirth ? new Date(candidate.dateOfBirth).toLocaleDateString() : "-"} />
          <Bio label="Gender" value={candidate.gender} />
          <Bio label="Email" value={candidate.email} />
          <Bio label="Mobile" value={candidate.mobile} />
          <Bio label="Address" value={candidate.address} />
          <Bio label="Pincode" value={candidate.pincode} />
          <Bio label="Experience" value={candidate.experience} />
          <Bio label="Availability" value={candidate.availability} />
          <Bio label="Skills" value={(candidate.skills || []).join(", ")} />
          <Bio label="Application government ID" value={item.governmentIdUrl ? "Submitted" : "-"} />
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
          <h3 className="font-display text-lg font-semibold">About</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{candidate.about || "No description provided."}</p>
        </div>

        <div className="mt-6">
          <h3 className="font-display text-lg font-semibold">Uploaded files</h3>
          <div className="admin-doc-grid mt-4">
            {documents.map(({ label, doc }, index) => <DocumentPreview key={`${getDocUrl(doc)}-${index}`} label={label} doc={doc} />)}
            {!documents.length ? <p className="text-sm text-muted-foreground">No documents uploaded.</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function Bio({ label, value }) {
  return <div className="rounded-xl bg-muted p-3"><small className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</small><p className="mt-1 text-sm font-semibold">{value || "-"}</p></div>;
}

function DocumentPreview({ label, doc }) {
  const [open, setOpen] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [blobPreviewUrl, setBlobPreviewUrl] = useState("");
  const url = getDocUrl(doc);
  const isImage = isImageDocument(doc, label);
  const isPdf = isPdfDocument(doc, label);

  useEffect(() => {
    if (!open || !url || isImage || !isPdf) return undefined;
    const controller = new AbortController();
    let objectUrl = "";
    setPreviewLoading(true);
    setPreviewFailed(false);
    setBlobPreviewUrl("");

    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load document");
        return response.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        setBlobPreviewUrl(objectUrl);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setPreviewFailed(true);
      })
      .finally(() => setPreviewLoading(false));

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, url, isImage, isPdf]);

  if (!url) return null;
  return (
    <>
      <button className="admin-doc" type="button" onClick={() => { setPreviewFailed(false); setOpen(true); }}>
        {isImage ? <img src={url} alt={label} /> : <span className="admin-doc-icon">{isPdf ? <FileText size={32} /> : <ImageIcon size={32} />}</span>}
        <b>{label}</b>
        <span>{isImage || isPdf ? "Live preview" : "Open file"}</span>
      </button>
      {open ? (
        <div className="document-modal" role="dialog" aria-modal="true" aria-label={`${label} preview`} onMouseDown={() => setOpen(false)}>
          <div className="document-modal-card" onMouseDown={(event) => event.stopPropagation()}>
            <div className="document-modal-head">
              <div>
                <strong>{label}</strong>
                <span>{isImage ? "Image preview" : isPdf ? "PDF preview" : "Document file"}</span>
              </div>
              <div>
                <a href={url} target="_blank" rel="noreferrer" className="btn-secondary">Open <ExternalLink size={15} /></a>
                <a href={url} download className="btn-secondary">Download <Download size={15} /></a>
                <button className="document-close" type="button" onClick={() => setOpen(false)} aria-label="Close preview"><X size={20} /></button>
              </div>
            </div>
            {previewLoading ? (
              <div className="document-preview-fallback">
                <span className="loading-spinner" />
                <h3>Preparing preview</h3>
                <p>Candidate upload ko live preview ke liye load kiya ja raha hai.</p>
              </div>
            ) : previewFailed ? (
              <div className="document-preview-fallback">
                <FileText size={42} />
                <h3>Preview could not load</h3>
                <p>Browser ne inline preview block kiya hai. Open button se file new tab me verify kar sakte hain.</p>
                <a href={url} target="_blank" rel="noreferrer" className="btn-search">Open document <ExternalLink size={15} /></a>
              </div>
            ) : isImage ? (
              <img className="document-modal-image" src={url} alt={label} onError={() => setPreviewFailed(true)} />
            ) : isPdf ? (
              <iframe className="document-modal-frame" src={blobPreviewUrl || url} title={label} onError={() => setPreviewFailed(true)} />
            ) : (
              <div className="document-preview-fallback">
                <FileText size={42} />
                <h3>Preview not available</h3>
                <p>This file type can be reviewed with Open or Download.</p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

function InterviewModal({ items, value, onChange, onClose, onSubmit, loading }) {
  const set = (key, next) => onChange((current) => ({ ...current, [key]: next }));
  const remote = value.mode === "remote";
  const single = items.length === 1 ? items[0] : null;
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-foreground/45 p-4" onMouseDown={onClose}>
      <form className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-lift" onSubmit={onSubmit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <Users className="size-3.5 text-signal" />
              {items.length} candidate{items.length > 1 ? "s" : ""}
            </div>
            <h2 className="mt-3 font-display text-xl font-bold">Planned Interview Window</h2>
            <p className="mt-1 text-sm text-muted-foreground">{single ? `${single.candidate?.fullName || "Candidate"} - ${single.job?.title || "Job"}` : "Same interview window will be sent to all selected candidates."}</p>
          </div>
          <Button variant="ghost" size="icon" type="button" onClick={onClose}><X className="size-5" /></Button>
        </div>

        <div className="mt-6 grid gap-4">
          <div className="rounded-2xl border border-border bg-surface p-4 text-sm text-muted-foreground">
            <div className="mb-2 flex items-center gap-2 font-semibold text-foreground"><CheckCircle2 className="size-4 text-verified" /> Candidate instructions</div>
            {remote ? "Online candidates will be told to join from a quiet place with stable internet, no nearby disturbance, and documents ready." : "Physical candidates will be told to reach the venue 30 minutes before the scheduled time and carry government ID/documents."}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mode" as="select" value={value.mode} onChange={(e) => set("mode", e.target.value)}>
              <option value="remote">Remote</option>
              <option value="physical">Physical / in-person</option>
            </Field>
            <Field label="HR Name" value={value.hrName} onChange={(e) => set("hrName", e.target.value)} placeholder="e.g. Priya Sharma" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Support contact" value={value.supportContact} onChange={(e) => set("supportContact", e.target.value)} required />
            <Field label="Date" type="date" value={value.date} onChange={(e) => set("date", e.target.value)} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Time" type="time" value={value.time} onChange={(e) => set("time", e.target.value)} required />
          </div>
          {remote ? (
            <Field label="Meeting link" type="url" value={value.meetingUrl} onChange={(e) => set("meetingUrl", e.target.value)} placeholder="https://meet.google.com/..." required />
          ) : (
            <>
              <Field label="Interview location" as="textarea" value={value.locationAddress} onChange={(e) => set("locationAddress", e.target.value)} required />
              <Field label="Google Maps URL" type="url" value={value.mapLink} onChange={(e) => set("mapLink", e.target.value)} />
            </>
          )}
          <Button variant="signal" disabled={loading}>{loading ? "Scheduling..." : `Schedule & notify ${items.length} candidate${items.length > 1 ? "s" : ""}`}</Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, as, children, ...props }) {
  const Comp = as || "input";
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <Comp className="mt-2 min-h-11 w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-signal" {...props}>{children}</Comp>
    </label>
  );
}
