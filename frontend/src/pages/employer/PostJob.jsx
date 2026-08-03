import { useState } from "react";
import { apiFetch, getSession } from "../../utils/auth.js";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext.jsx";

export default function PostJob() {
  const navigate = useNavigate();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [salary, setSalary] = useState("");

  async function submit(e) {
    e.preventDefault();
    const session = getSession();
    if (!session || session.role !== "employer") return navigate("/login", { state: { role: "employer", error: "Employer login required" } });
    try {
      await apiFetch("/jobs", { method: "POST", body: JSON.stringify({ title, salary }) });
      toast.show("Job posted and pending admin review", "success");
      navigate("/jobs");
    } catch (err) {
      toast.show(err.message, "error");
    }
  }

  return (
    <section className="form-page">
      <div className="section-header">
        <div className="section-label">Post Job</div>
        <h1 className="section-title">Post a Job</h1>
      </div>
      <form className="form-card animated-card" onSubmit={submit}>
        <div className="form-group"><label className="form-label">Job Title</label><input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
        <div className="form-group"><label className="form-label">Salary</label><input className="form-input" value={salary} onChange={(e) => setSalary(e.target.value)} /></div>
        <button className="btn-primary" type="submit">Submit</button>
      </form>
    </section>
  );
}
