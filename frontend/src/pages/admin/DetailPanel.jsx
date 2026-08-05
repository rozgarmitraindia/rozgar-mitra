import { useState } from "react";
import { ExternalLink, FileText, X } from "lucide-react";
import { moduleTitles, pickName, pickEmail, statusOptions } from "./adminApi.js";

function ValueRow({ label, value }) {
  if (value === undefined || value === null || value === "" || (Array.isArray(value) && !value.length)) return null;
  const display = Array.isArray(value) ? value.join(", ") : value;
  return (
    <p>
      <strong>{label}:</strong> {display}
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
  if (!doc) return null;
  const url = typeof doc === "string" ? doc : doc.url;
  if (!url) return null;
  const isImage = /\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i.test(url) || /profile|photo|logo/i.test(doc.type || title);
  return (
    <>
      <button className="admin-doc" type="button" onClick={() => setOpen(true)}>
        {isImage ? <img src={url} alt={title} /> : <span className="admin-doc-icon"><FileText size={32} /></span>}
        <b>{title}</b>
        <span>Preview</span>
      </button>
      {open ? (
        <div className="document-modal" role="dialog" aria-modal="true" aria-label={`${title} preview`} onMouseDown={() => setOpen(false)}>
          <div className="document-modal-card" onMouseDown={(event) => event.stopPropagation()}>
            <div className="document-modal-head"><strong>{title}</strong><div><a href={url} target="_blank" rel="noreferrer" className="btn-secondary">Open <ExternalLink size={15} /></a><button className="document-close" type="button" onClick={() => setOpen(false)} aria-label="Close preview"><X size={20} /></button></div></div>
            {isImage ? <img className="document-modal-image" src={url} alt={title} /> : <iframe className="document-modal-frame" src={url} title={title} />}
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function DetailPanel({ moduleKey, detail, activity, onClose, onStatus, statusLoading = false, onDelete, deleteLoading = false }) {
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

      <h3 className="form-title" style={{ fontSize: 20 }}>Documents</h3>
      <div className="admin-doc-grid">
        {docs.map(([title, doc], index) => <DocumentPreview key={`${title}-${index}`} title={title} doc={doc} />)}
      </div>

      <h3 className="form-title" style={{ fontSize: 20, marginTop: 24 }}>Recent Activity</h3>
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
