import { useState } from "react";
import { adminFetch } from "./adminApi.js";
import ListModule from "./ListModule.jsx";

function NotificationsComposer({ onSent }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState("inApp");
  const [message, setMessage] = useState("");

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    try {
      const result = await adminFetch("/admin/notifications", {
        method: "POST",
        body: JSON.stringify({ title, body, channel }),
      });
      setMessage(result.message || "Notification created");
      setTitle("");
      setBody("");
      onSent?.();
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <form className="form-card" onSubmit={submit} style={{ marginBottom: 18 }}>
      <div className="section-label">Create Notification</div>
      <h2 className="form-title">Notify Users</h2>
      {message ? <div className="login-success">{message}</div> : null}
      <div className="form-group">
        <label className="form-label">Title</label>
        <input className="form-input" value={title} onChange={(event) => setTitle(event.target.value)} required />
      </div>
      <div className="form-group">
        <label className="form-label">Channel</label>
        <select className="form-select" value={channel} onChange={(event) => setChannel(event.target.value)}>
          <option value="inApp">In App</option>
          <option value="email">Email</option>
          <option value="system">System</option>
          <option value="push">Push</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Body</label>
        <textarea className="form-textarea" value={body} onChange={(event) => setBody(event.target.value)} required />
      </div>
      <button className="btn-search" type="submit">Send Notification</button>
    </form>
  );
}

export default function Notifications() {
  return (
    <div className="admin-content-grid admin-tools-page">
      <NotificationsComposer />
      <ListModule moduleKey="notifications" />
    </div>
  );
}

function ListModulePlaceholder() {
  return (
    <section className="form-card">
      <div className="section-label">Notifications</div>
      <h1 className="form-title">Recent Notifications</h1>
      <p className="section-desc">View sent notifications and system messages here.</p>
    </section>
  );
}
