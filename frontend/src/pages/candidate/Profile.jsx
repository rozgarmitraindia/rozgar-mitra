import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, FileText, ImageIcon, X } from "lucide-react";
import { apiFetch, getSession, setSession } from "../../utils/auth.js";

function formatDate(value) {
  if (!value) return "Present";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function durationMonths(startDate, endDate) {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end < start) return 0;
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return Math.max(months + (end.getDate() >= start.getDate() ? 0 : -1), 0);
}

function formatDuration(totalMonths) {
  if (!totalMonths) return "Less than 1 month";
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  return [years ? `${years} year${years > 1 ? "s" : ""}` : "", months ? `${months} month${months > 1 ? "s" : ""}` : ""].filter(Boolean).join(" ");
}

function getDocUrl(doc) {
  return typeof doc === "string" ? doc : doc?.url;
}

function isImageDocument(doc, label = "") {
  const url = getDocUrl(doc) || "";
  const mimeType = typeof doc === "string" ? "" : doc?.mimeType || "";
  return mimeType.startsWith("image/") || /\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i.test(url) || /photo|image|profile/i.test(label);
}

function isPdfDocument(doc, label = "") {
  const url = getDocUrl(doc) || "";
  const mimeType = typeof doc === "string" ? "" : doc?.mimeType || "";
  return mimeType === "application/pdf" || /\.pdf(\?.*)?$/i.test(url) || /pdf|resume|government|document|id|aadhaar|proof/i.test(label);
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
        <span>Preview</span>
      </button>
      {open ? (
        <div className="document-modal" role="dialog" aria-modal="true" aria-label={`${label} preview`} onMouseDown={() => setOpen(false)}>
          <div className="document-modal-card" onMouseDown={(event) => event.stopPropagation()}>
            <div className="document-modal-head">
              <div>
                <strong>{label}</strong>
                <span>{isImage ? "Image preview" : isPdf ? "PDF preview" : "Document preview"}</span>
              </div>
              <div>
                <button className="document-close" type="button" onClick={() => setOpen(false)} aria-label="Close preview"><X size={20} /></button>
              </div>
            </div>
            {previewLoading ? (
              <div className="document-preview-fallback">
                <span className="loading-spinner" />
                <h3>Preparing preview</h3>
                <p>Document preview load ho raha hai.</p>
              </div>
            ) : previewFailed ? (
              <div className="document-preview-fallback">
                <FileText size={42} />
                <h3>Preview could not load</h3>
                <p>Browser inline preview block kar raha hai. File verify karne ke liye open karein.</p>
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
                <p>This file type cannot be previewed inline.</p>
                <a href={url} target="_blank" rel="noreferrer" className="btn-search">Open document <ExternalLink size={15} /></a>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function Profile() {
  const sessionUser = getSession()?.user || {};
  const [user, setUser] = useState(sessionUser);
  const [loading, setLoading] = useState(true);
  const documents = user.documents || [];
  const workExperiences = user.workExperiences || [];
  const totalMonths = useMemo(
    () => user.workExperienceMonths ?? workExperiences.reduce((sum, item) => sum + durationMonths(item.startDate, item.endDate), 0),
    [user.workExperienceMonths, workExperiences],
  );

  useEffect(() => {
    let mounted = true;
    async function loadProfile() {
      try {
        const result = await apiFetch("/user/me");
        const nextUser = result.data?.user || sessionUser;
        if (!mounted) return;
        setUser(nextUser);
        const session = getSession();
        if (session?.token) setSession({ ...session, user: nextUser }, localStorage.getItem("rozgar_session") !== null);
      } catch {
        if (mounted) setUser(sessionUser);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadProfile();
    return () => { mounted = false; };
  }, []);

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <div className="section-label">Candidate Profile</div>
          <h1 className="section-title">My Profile</h1>
          <p className="section-desc">{loading ? "Refreshing profile..." : "Profile information is shown from your current account details."}</p>
        </div>
        <Link className="btn-search" to="/edit-profile">Edit Profile</Link>
      </div>

      <div className="form-card profile-grid">
        <div className="profile-card">
          <div className="profile-avatar" style={{ backgroundImage: user.profilePhoto ? `url(${user.profilePhoto.url})` : undefined }}>
            {!user.profilePhoto && <span>{(user.fullName || "C")[0]}</span>}
          </div>
          <div className="detail-list">
            <p><strong>ID:</strong> {user.immutableId || "-"}</p>
            <p><strong>Name:</strong> {user.fullName || "-"}</p>
            <p><strong>Email:</strong> {user.email || "-"}</p>
            <p><strong>Phone:</strong> {user.mobile || user.phone || "-"}</p>
            <p><strong>Address:</strong> {user.address || "-"}</p>
            <p><strong>Skills:</strong> {(user.skills || []).join(", ") || "-"}</p>
            <p><strong>Experience:</strong> {user.experience || formatDuration(totalMonths)}</p>
            <p><strong>Availability:</strong> {user.availability || "-"}</p>
          </div>
        </div>

        <div className="profile-card">
          <div className="section-label">About</div>
          <p className="detail-desc">{user.about || "No description provided."}</p>
          <div className="section-label" style={{ marginTop: 20 }}>Resume Preview</div>
          {user.resume?.url ? (
            <div className="admin-doc-grid" style={{ marginTop: 12 }}>
              <DocumentPreview label="Resume" doc={user.resume} />
            </div>
          ) : (
            <p className="detail-desc">No resume uploaded yet.</p>
          )}
          <div className="section-label" style={{ marginTop: 20 }}>Documents</div>
          {documents.length ? (
            <div className="admin-doc-grid" style={{ marginTop: 12 }}>
              {documents.map((doc, index) => (
                <DocumentPreview key={doc.url || index} label={doc.type || `Document ${index + 1}`} doc={doc} />
              ))}
            </div>
          ) : (
            <p className="detail-desc">No documents uploaded.</p>
          )}
        </div>
      </div>

      <div className="form-card" style={{ marginTop: 24 }}>
        <div className="section-header" style={{ marginBottom: 18 }}>
          <div>
            <div className="section-label">Work Experience</div>
            <h2 className="form-title">Employment history</h2>
            <p className="section-desc">Hired jobs automatically start here. When employment ends, the end date and reason are saved.</p>
          </div>
          <div className="generated-id" style={{ margin: 0 }}>
            <span>Total counted experience</span>
            <strong>{formatDuration(totalMonths)}</strong>
          </div>
        </div>
        {workExperiences.length ? (
          <div className="detail-list">
            {workExperiences.map((item) => {
              const months = durationMonths(item.startDate, item.endDate);
              return (
                <div key={item._id || item.application} className="profile-card" style={{ marginBottom: 14 }}>
                  <p><strong>{item.jobTitle || item.role || "Job"}</strong> at {item.companyName || "Company"}</p>
                  <p>{formatDate(item.startDate)} - {formatDate(item.endDate)} · {formatDuration(months)}</p>
                  <p><strong>Status:</strong> {item.status === "active" ? "Currently working" : "Ended"}</p>
                  {item.terminationReason ? <p><strong>Reason:</strong> {item.terminationReason}</p> : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="detail-desc">No verified work experience yet. It will appear automatically when an employer hires you.</p>
        )}
      </div>
    </section>
  );
}
