import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { useToast } from "../../contexts/ToastContext.jsx";
import { getSession } from "../../utils/auth.js";
import { fetchJobs, toggleJobSaved } from "./candidateApi.js";

export default function BrowseJobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [q, setQ] = useState("");
  const [city, setCity] = useState("All Cities");
  const [category, setCategory] = useState("All Categories");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { lang } = useLanguage();
  const toast = useToast();

  useEffect(() => {
    async function loadJobs() {
      setLoading(true);
      setError("");
      try {
        const items = await fetchJobs();
        setJobs(items);
      } catch (err) {
        setError(err.message || "Unable to load jobs.");
      } finally {
        setLoading(false);
      }
    }
    loadJobs();
  }, []);

  const filtered = useMemo(() => jobs.filter((job) => {
    const qmatch = q.trim() === "" || `${job.title} ${job.companyName || job.company || ""} ${(job.skills || job.tags || []).join(" ")}`.toLowerCase().includes(q.toLowerCase());
    const cmatch = city === "All Cities" || (job.location || job.address || "").toLowerCase().includes(city.toLowerCase());
    const catmatch = category === "All Categories" || (job.role || "").toLowerCase().includes(category.toLowerCase());
    return qmatch && cmatch && catmatch;
  }), [jobs, q, city, category]);

  async function handleSave(job) {
    const session = getSession();
    if (!session) {
      navigate("/login", { state: { from: `/jobs/${job._id || job.id}`, role: "candidate", error: "Save karne ke liye login required hai." } });
      return;
    }
    try {
      const result = await toggleJobSaved(job._id || job.id);
      setJobs((items) => items.map((item) => {
        if (String(item._id || item.id) !== String(job._id || job.id)) return item;
        return {
          ...item,
          isSaved: !item.isSaved,
          savedCount: result.data?.savedCount ?? item.savedCount,
        };
      }));
      toast.show(result.message, "success");
    } catch (err) {
      toast.show(err.message || "Unable to update save status.", "error");
    }
  }

  return (
    <section className="section">
      <div className="section-header">
        <div className="section-label">Browse Jobs</div>
        <h1 className="section-title">{lang === "en" ? "Find Work" : "नौकरी खोजें"}</h1>
        <p className="section-desc">{lang === "en" ? "Search, filter, save and apply after login." : "खोजें, फ़िल्टर करें, सेव और आवेदन करने के लिए लॉगिन करें।"}</p>
      </div>
      <div className="search-box" style={{ margin: "0 auto 28px" }}>
        <input placeholder="Job title, skill, company" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={city} onChange={(e) => setCity(e.target.value)}>
          <option>All Cities</option>
          <option>Lucknow</option>
          <option>Delhi</option>
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option>All Categories</option>
          <option>House Maid</option>
          <option>Driver</option>
        </select>
        <button className="btn-search" type="button">Search</button>
      </div>
      {error ? <div className="login-error">{error}</div> : null}
      {loading ? (
        <div className="section"><p className="section-desc">Loading jobs…</p></div>
      ) : (
        <div className="jobs-grid">
          {filtered.length ? filtered.map((job) => (
            <article className="job-card animated-card" key={job._id || job.id}>
              <Link to={`/jobs/${job._id || job.id}`} className="job-card-header">
                <div className="job-icon">{job.icon || "💼"}</div>
                <div><h3 className="job-title">{job.title}</h3><div className="job-company">{job.companyName || job.company} • {job.location || job.address}</div></div>
              </Link>
              <div className="job-tags">{(job.skills || job.tags || []).map((tag) => <span className="job-tag" key={tag}>{tag}</span>)}</div>
              <div className="job-footer">
                <span className="job-salary">{job.salary || "—"}</span>
                <button className="btn-wa" type="button" onClick={() => handleSave(job)}>{job.isSaved ? "Saved" : `♡ ${lang === "en" ? "Save" : "सेव"}`}</button>
                <Link to={`/jobs/${job._id || job.id}`} className="btn-search">{lang === "en" ? "View" : "देखें"}</Link>
              </div>
            </article>
          )) : (
            <div className="section"><p className="section-desc">No jobs found. Try a different search.</p></div>
          )}
        </div>
      )}
    </section>
  );
}
