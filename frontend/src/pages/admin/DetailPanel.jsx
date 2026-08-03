import { moduleTitles, pickName, pickEmail } from "./adminApi.js";

function ValueRow({ label, value }) {
  if (value === undefined || value === null || value === "" || (Array.isArray(value) && !value.length)) return null;
  const display = Array.isArray(value) ? value.join(", ") : String(value);
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
  if (!doc) return null;
  const url = typeof doc === "string" ? doc : doc.url;
  if (!url) return null;
  const isImage = /\.(png|jpg|jpeg|webp|gif)$/i.test(url);
  return (
    <a className="admin-doc" href={url} target="_blank" rel="noreferrer">
      {isImage ? <img src={url} alt={title} /> : <span>Open Document</span>}
      <b>{title}</b>
    </a>
  );
}

export default function DetailPanel({ moduleKey, detail, activity, onClose, onStatus }) {
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
        <ValueRow label="Experience" value={item.experience} />
        <ValueRow label="About" value={item.about || item.description || item.message} />
        <ValueRow label="Company" value={item.companyName || item.employer?.companyName} />
        <ValueRow label="Property" value={item.propertyName || item.owner?.propertyName} />
        <ValueRow label="Salary / Rent" value={item.salary || item.rent} />
        <ValueRow label="Google Map" value={item.googleMapLink} />
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
            <button className="btn-search" type="button" onClick={() => onStatus('live')}>Approve</button>
            <button className="btn-secondary" type="button" onClick={() => onStatus('rejected', true)}>Reject</button>
          </>
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
