import { useState } from "react";
import { apiFetch, getSession } from "../../utils/auth.js";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext.jsx";

export default function PostRoom() {
  const navigate = useNavigate();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [rent, setRent] = useState("");

  async function submit(e) {
    e.preventDefault();
    const session = getSession();
    if (!session || session.role !== "roomOwner") return navigate("/login", { state: { role: "roomOwner", error: "Room Owner login required" } });
    try {
      await apiFetch("/rooms", { method: "POST", body: JSON.stringify({ title, rent }) });
      toast.show("Room posted and pending admin review", "success");
      navigate("/rooms");
    } catch (err) {
      toast.show(err.message, "error");
    }
  }

  return (
    <section className="form-page">
      <div className="section-header">
        <div className="section-label">Post Room</div>
        <h1 className="section-title">Post a Room / PG</h1>
      </div>
      <form className="form-card animated-card" onSubmit={submit}>
        <div className="form-group"><label className="form-label">Title</label><input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
        <div className="form-group"><label className="form-label">Rent</label><input className="form-input" value={rent} onChange={(e) => setRent(e.target.value)} /></div>
        <button className="btn-primary" type="submit">Submit</button>
      </form>
    </section>
  );
}
