import { useEffect, useState } from "react";
import { Download, ExternalLink, FileText, ImageIcon, X } from "lucide-react";
import { moduleTitles, pickName, pickEmail, statusOptions } from "./adminApi.js";

function ValueRow({ label, value }) {
  if (value === undefined || value === null || value === "" || (Array.isArray(value) && !value.length)) return null;
  const display = Array.isArray(value) ? value.join(", ") : value;
  return (
    <p className="admin-value-row">
      <span>{label}</span>
      <strong>{display}</strong>
    </p>
  );
}

function StatusPill({ status }) {
  const color = status === "verified" || status === "live" || status === "resolved" || status === "sent"
    ? ["var(--green-pale)", "var(--green)"]
    : status === "rejected" || status === "suspended" || status === "failed"
      ? ["#fff1f2", "#991b1b"]
      : ["var(--gold-pale)", "#92400E"];
  return <span className="status-pill" style={{ background: color[0], color: color[1] }}>{status || "pending"}</span>;
}

function DocumentPreview({ title, doc }) {
  const [open, setOpen] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const url = typeof doc === "string" ? doc : doc?.url;
  const type = String(doc?.type || title || "");
  const isImage = /\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i.test(url) || /profile|photo|logo|image/i.test(type);
  const isPdf = /\.pdf(\?.*)?$/i.test(url) || /pdf|government|document|resume|id|aadhaar|proof/i.test(type);
  const isBlockedCloudinaryPdf = Boolean(url && /res\.cloudinary\.com\/.+\/image\/upload\/.+\.pdf/i.test(url));
  const [blobPreviewUrl, setBlobPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewUrl = blobPreviewUrl || (isPdf && url ? `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url)}` : url);

  useEffect(() => {
    if (!open || !url || isImage || isBlockedCloudinaryPdf) return undefined;
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
        const normalizedBlob = isPdf ? new Blob([blob], { type: "application/pdf" }) : blob;
        objectUrl = URL.createObjectURL(normalizedBlob);
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

  if (!doc || !url) return null;

  function openModal() {
    setPreviewFailed(false);
    setOpen(true);
  }

  return (
    <>
      <button className="admin-doc" type="button" onClick={openModal}>
        {isImage ? <img src={url} alt={title} /> : <span className="admin-doc-icon">{isPdf ? <FileText size={32} /> : <ImageIcon size={32} />}</span>}
        <b>{title}</b>
        <span>{isImage ? "View image" : "Preview / open"}</span>
      </button>
      {open ? (
        <div className="document-modal" role="dialog" aria-modal="true" aria-label={`${title} preview`} onMouseDown={() => setOpen(false)}>
          <div className="document-modal-card" onMouseDown={(event) => event.stopPropagation()}>
            <div className="document-modal-head">
              <div>
                <strong>{title}</strong>
                <span>{isPdf ? "PDF/document preview" : "Document preview"}</span>
              </div>
              <div>
                {!isBlockedCloudinaryPdf ? (
                  <>
                    <a href={url} target="_blank" rel="noreferrer" className="btn-secondary">Open <ExternalLink size={15} /></a>
                    <a href={url} download className="btn-secondary">Download <Download size={15} /></a>
                  </>
                ) : null}
                <button className="document-close" type="button" onClick={() => setOpen(false)} aria-label="Close preview"><X size={20} /></button>
              </div>
            </div>
            {isBlockedCloudinaryPdf ? (
              <div className="document-preview-fallback">
                <FileText size={42} />
                <h3>Re-upload required</h3>
                <p>This PDF was uploaded with Cloudinary image delivery, which is blocked by Cloudinary security. New document uploads are fixed; ask the user to upload this document again.</p>
              </div>
            ) : previewLoading ? (
              <div className="document-preview-fallback">
                <span className="loading-spinner" />
                <h3>Preparing preview</h3>
                <p>Document ko secure preview ke liye load kiya ja raha hai.</p>
              </div>
            ) : previewFailed ? (
              <div className="document-preview-fallback">
                <FileText size={42} />
                <h3>Preview could not load</h3>
                <p>Browser PDF preview sometimes blocks Cloudinary raw documents. Open or download the file to review it.</p>
                <a href={url} target="_blank" rel="noreferrer" className="btn-search">Open document <ExternalLink size={15} /></a>
              </div>
            ) : isImage ? (
              <img className="document-modal-image" src={url} alt={title} onError={() => setPreviewFailed(true)} />
            ) : (
              <iframe className="document-modal-frame" src={previewUrl} title={title} onError={() => setPreviewFailed(true)} />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function DetailPanel({ moduleKey, detail, activity, onClose, onStatus, statusLoading = false, onDelete, onDeleteAccount, deleteLoading = false }) {
  const item = detail;
  if (!item) return null;

  const docs = [
    ["Profile Image", item.profilePhoto],
    ["Resume", item.resume],
    ["Government ID", item.documents?.find((doc) => /gov|aadhaar|id/i.test(doc.type || "")) || item.documents?.[0]],
    ...(item.documents || []).map((doc, index) => [`Document ${index + 1}`, doc]),
    ...(item.companyDocs || []).map((doc, index) => [`Company Doc ${index + 1}`, doc]),
    ...(item.roomPhotos || []).map((doc, index) => [`Room Photo ${index + 1}`, doc]),
    ...(item.photos || []).map((url, index) => [`Room Photo ${index + 1}`, url]),
  ];

  return (
    <aside className="admin-detail">
      <div className="admin-detail-head">
        <div>
          <div className="section-label">{moduleTitles[moduleKey]}</div>
          <h2 className="form-title">{pickName(item, moduleKey)}</h2>
        </div>
        <button className="btn-secondary" type="button" onClick={onClose}>Close</button>
      </div>

      <div className="detail-list">
        <ValueRow label="ID" value={item.immutableId || item.postId || item.roomId || item._id} />
        <ValueRow label="Status" value={<StatusPill status={item.status} />} />
        <ValueRow label="Email" value={pickEmail(item, moduleKey)} />
        <ValueRow label="Mobile" value={item.mobile || item.companyPhone || item.contactNumber} />
        <ValueRow label="Address" value={item.address} />
        <ValueRow label="Skills" value={item.skills || item.amenities} />
        <ValueRow label="Role / Department" value={item.role} />
        <ValueRow label="Employment Type" value={item.employmentType} />
        <ValueRow label="Vacancies" value={item.vacancies} />
        <ValueRow label="Eligible Gender" value={item.genderNeeded} />
        <ValueRow label="Experience" value={item.experience} />
        <ValueRow label="About" value={item.about || item.description || item.message} />
        <ValueRow label="Requirements" value={item.requirements} />
        <ValueRow label="Benefits" value={item.benefits} />
        <ValueRow label="Company" value={item.companyName || item.employer?.companyName} />
        <ValueRow label="Property" value={item.propertyName || item.owner?.propertyName} />
        <ValueRow label="Salary / Rent" value={item.salary || item.rent} />
        <ValueRow label="Applications Open" value={item.applicationStartDate ? new Date(item.applicationStartDate).toLocaleDateString() : null} />
        <ValueRow label="Applications Close" value={item.applicationEndDate ? new Date(item.applicationEndDate).toLocaleDateString() : null} />
        <ValueRow label="Interview Window" value={item.interviewStartDate && item.interviewEndDate ? `${new Date(item.interviewStartDate).toLocaleDateString()} – ${new Date(item.interviewEndDate).toLocaleDateString()}` : null} />
        <ValueRow label="Interview Timing" value={item.interviewStartTime && item.interviewEndTime ? `${item.interviewStartTime} – ${item.interviewEndTime}` : null} />
        <ValueRow label="Interview Mode" value={item.interviewMode} />
        <ValueRow label="Interview Details" value={item.interviewDetails} />
        <ValueRow label="Google Map" value={item.googleMapLink} />
        <ValueRow label="Contact" value={item.contactNumber} />
        <ValueRow label="Admin Reason" value={item.adminReason} />
      </div>

      <div className="admin-actions">
        {['candidates', 'employers', 'room-owners'].includes(moduleKey) ? (
          <>
            <button className="btn-search" type="button" onClick={() => onStatus('verified')}>Verify</button>
            <button className="btn-secondary" type="button" onClick={() => onStatus('rejected', true)}>Reject</button>
            <button className="btn-secondary" type="button" onClick={() => onStatus('suspended', true)}>Suspend</button>
            <button className="btn-secondary" type="button" onClick={() => onStatus('unverified', true)}>Unverify</button>
            <button className="btn-danger" type="button" disabled={deleteLoading || statusLoading} onClick={onDeleteAccount}>
              {deleteLoading ? "Deleting..." : "Delete Account"}
            </button>
          </>
        ) : null}
        {['jobs', 'rooms'].includes(moduleKey) ? (
          <>
            <button className="btn-search" type="button" disabled={statusLoading} onClick={() => onStatus('live')}>{statusLoading ? "Updating..." : "Approve & Publish"}</button>
            <button className="btn-secondary" type="button" disabled={statusLoading} onClick={() => onStatus('rejected', item.status !== 'live')}>{item.status === 'live' ? 'Reject & Unpublish' : 'Reject'}</button>
          </>
        ) : null}
        {moduleKey === 'jobs' ? (
          <button className="btn-danger" type="button" disabled={deleteLoading || statusLoading} onClick={onDelete}>
            {deleteLoading ? 'Deleting...' : 'Delete Job'}
          </button>
        ) : null}
        {['applications', 'bookings', 'complaints'].includes(moduleKey) ? (
          (statusOptions[moduleKey] || []).filter((status) => status !== item.status).map((status) => (
            <button
              className={status === 'rejected' ? 'btn-secondary' : 'btn-search'}
              type="button"
              key={status}
              onClick={() => onStatus(status, status === 'rejected')}
            >
              {status.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())}
            </button>
          ))
        ) : null}
      </div>

      <h3 className="form-title admin-section-title">Documents</h3>
      <div className="admin-doc-grid">
        {docs.map(([title, doc], index) => <DocumentPreview key={`${title}-${index}`} title={title} doc={doc} />)}
        {!docs.some(([, doc]) => doc && (typeof doc === "string" ? doc : doc.url)) ? <p className="admin-empty-inline">No documents uploaded.</p> : null}
      </div>

      <h3 className="form-title admin-section-title">Recent Activity</h3>
      <div className="admin-activity">
        {(activity || []).map((log) => (
          <div key={log._id} className="detail-desc">
            <b>{log.action}</b> - {log.status || log.module}
            <br />
            <span>{log.reason || log.actor?.email || new Date(log.createdAt).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
