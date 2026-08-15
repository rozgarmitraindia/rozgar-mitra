import { useState } from "react";
import { BellRing, Mail, Megaphone, Radio, Send, ShieldCheck, Trash2 } from "lucide-react";
import { adminFetch } from "./adminApi.js";
import ListModule from "./ListModule.jsx";

const audiences = [
  ["", "All active users", "Everyone with an active account"],
  ["candidate", "Candidates", "Job seekers and applicants"],
  ["employer", "Companies", "Companies and hiring teams"],
  ["roomOwner", "Room Owners", "PG, hotel and room partners"],
  ["admin", "Admins", "Internal admin operators"],
];

const channels = [
  ["inApp", "In App", BellRing],
  ["email", "Email", Mail],
  ["push", "Push", Radio],
  ["system", "System", ShieldCheck],
];

function NotificationsComposer({ onSent }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState("inApp");
  const [targetRole, setTargetRole] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    setSending(true);
    try {
      const result = await adminFetch("/admin/notifications", {
        method: "POST",
        body: JSON.stringify({ title, body, channel, ...(targetRole ? { targetRole } : {}) }),
      });
      setMessage(result.message || "Notification created");
      setTitle("");
      setBody("");
      onSent?.();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="form-card admin-notification-composer" onSubmit={submit}>
      <div className="admin-composer-head">
        <div className="admin-composer-icon"><Megaphone size={22} /></div>
        <div>
          <div className="section-label">Broadcast Center</div>
          <h1 className="form-title">Notify Users</h1>
          <p className="section-desc">Send operational updates to the right audience without leaving the admin console.</p>
        </div>
      </div>

      {message ? <div className={message.toLowerCase().includes("failed") || message.toLowerCase().includes("error") ? "login-error" : "login-success"}>{message}</div> : null}

      <div className="admin-composer-grid">
        <div className="admin-composer-main">
          <label className="form-group">
            <span className="form-label">Title</span>
            <input className="form-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Interview schedule reminder" required />
          </label>
          <label className="form-group">
            <span className="form-label">Message</span>
            <textarea className="form-textarea admin-notification-textarea" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a clear update for users..." required />
          </label>
        </div>

        <div className="admin-composer-side">
          <div>
            <span className="form-label">Audience</span>
            <div className="admin-choice-list">
              {audiences.map(([value, label, helper]) => (
                <button type="button" key={label} className={`admin-choice ${targetRole === value ? "active" : ""}`} onClick={() => setTargetRole(value)}>
                  <strong>{label}</strong>
                  <span>{helper}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="form-label">Channel</span>
            <div className="admin-channel-grid">
              {channels.map(([value, label, Icon]) => (
                <button type="button" key={value} className={`admin-channel ${channel === value ? "active" : ""}`} onClick={() => setChannel(value)}>
                  <Icon size={17} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <button className="btn-search admin-send-button" type="submit" disabled={sending}>
            {sending ? <span className="loading-spinner" /> : <Send size={16} />}
            {sending ? "Sending..." : "Send to Audience"}
          </button>
        </div>
      </div>
    </form>
  );
}

export default function Notifications() {
  const [refreshToken, setRefreshToken] = useState(0);
  const [deletingAll, setDeletingAll] = useState(false);

  async function deleteAllNotifications() {
    if (!window.confirm("Permanently delete all notifications for all users?")) return;
    setDeletingAll(true);
    try {
      await adminFetch("/admin/notifications/all", { method: "DELETE" });
      setRefreshToken((value) => value + 1);
    } catch (err) {
      alert(err.message || "Unable to delete notifications");
    } finally {
      setDeletingAll(false);
    }
  }

  return (
    <div className="admin-notifications-page">
      <NotificationsComposer onSent={() => setRefreshToken((value) => value + 1)} />
      <div className="form-card admin-list-head">
        <div>
          <div className="section-label">Notification cleanup</div>
          <h2 className="form-title">Permanent delete tools</h2>
          <p className="section-desc">Delete particular notifications from the list, or clear all notification records permanently.</p>
        </div>
        <button className="btn-danger admin-icon-button" type="button" disabled={deletingAll} onClick={deleteAllNotifications}>
          <Trash2 size={16} />
          {deletingAll ? "Deleting..." : "Delete All"}
        </button>
      </div>
      <ListModule moduleKey="notifications" refreshToken={refreshToken} />
    </div>
  );
}
