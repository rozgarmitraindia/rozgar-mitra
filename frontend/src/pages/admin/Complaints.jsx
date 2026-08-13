import { useEffect, useMemo, useState } from "react";
import { Mail, RefreshCw, Reply } from "lucide-react";
import { adminFetch } from "./adminApi.js";
import { useToast } from "../../contexts/ToastContext.jsx";

export default function Complaints() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  const openCount = useMemo(() => items.filter((item) => item.status !== "resolved").length, [items]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await adminFetch("/admin/contact-messages");
      setItems(result.data?.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function sendReply(event) {
    event.preventDefault();
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      const result = await adminFetch(`/admin/contact-messages/${selected._id}/reply`, { method: "POST", body: JSON.stringify({ reply: reply.trim() }) });
      const next = result.data?.item;
      setItems((current) => current.map((item) => item._id === next._id ? next : item));
      setSelected(next);
      setReply("");
      toast.show(result.message || "Email reply sent", "success");
    } catch (err) {
      toast.show(err.message || "Unable to send reply", "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="form-card admin-module-card">
      <div className="admin-list-head">
        <div><div className="section-label">Contact inbox</div><h1 className="form-title">Contact Us Messages</h1><p className="section-desc">Read visitor enquiries and reply directly to their email address.</p></div>
        <button className="btn-secondary admin-icon-button" onClick={load} disabled={loading} type="button"><RefreshCw size={16} />Refresh</button>
      </div>
      <div className="admin-metric-strip"><div><span>Total</span><strong>{items.length}</strong></div><div><span>Open</span><strong>{openCount}</strong></div><div><span>Replied</span><strong>{items.length - openCount}</strong></div></div>
      {error ? <div className="login-error">{error}</div> : null}
      <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="grid content-start gap-3">
          {items.map((item) => <button className={`rounded-xl border p-4 text-left ${selected?._id === item._id ? "border-signal bg-signal/10" : "border-border bg-surface"}`} type="button" key={item._id} onClick={() => { setSelected(item); setReply(""); }}><div className="flex justify-between gap-3"><b>{item.contactName || "Visitor"}</b><span className="text-xs capitalize text-muted-foreground">{item.status}</span></div><p className="mt-1 text-sm font-semibold">{item.subject}</p><p className="mt-1 truncate text-xs text-muted-foreground">{item.contactEmail} · {new Date(item.createdAt).toLocaleString()}</p></button>)}
          {!loading && !items.length ? <p className="section-desc">No contact messages yet.</p> : null}
          {loading ? <p className="section-desc">Loading messages...</p> : null}
        </div>
        {selected ? <article className="rounded-2xl border border-border bg-surface p-5"><div className="flex items-center gap-2"><Mail size={18} className="text-signal" /><h2 className="font-display text-xl font-bold">{selected.subject}</h2></div><div className="mt-4 grid gap-2 text-sm"><p><b>From:</b> {selected.contactName}</p><p><b>Email:</b> <a className="text-signal" href={`mailto:${selected.contactEmail}`}>{selected.contactEmail}</a></p><p><b>Mobile:</b> {selected.contactMobile}</p></div><div className="mt-5 whitespace-pre-wrap rounded-xl border border-border bg-card p-4 text-sm leading-7">{selected.message}</div>{selected.adminReply ? <div className="mt-5 rounded-xl border border-verified/30 bg-verified/10 p-4"><b>Admin reply</b><p className="mt-2 whitespace-pre-wrap text-sm">{selected.adminReply}</p><small className="mt-2 block text-muted-foreground">Sent {selected.repliedAt ? new Date(selected.repliedAt).toLocaleString() : ""}</small></div> : null}<form className="mt-5" onSubmit={sendReply}><label className="form-label">Reply by email</label><textarea className="form-textarea" value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write your reply..." minLength={2} required /><button className="btn-primary mt-3" disabled={sending} type="submit"><Reply size={16} />{sending ? "Sending..." : "Send Email Reply"}</button></form></article> : <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-border text-muted-foreground">Select a message to read and reply.</div>}
      </div>
    </section>
  );
}
