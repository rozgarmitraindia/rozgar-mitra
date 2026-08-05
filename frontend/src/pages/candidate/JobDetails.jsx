import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getSession } from "../../utils/auth.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { useToast } from "../../contexts/ToastContext.jsx";
import { applyJob, fetchJobDetail, toggleJobSaved } from "./candidateApi.js";

export default function JobDetails() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const toast = useToast();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadJob() {
      setLoading(true);
      setError("");
      try {
        const item = await fetchJobDetail(jobId);
        setJob(item);
      } catch (err) {
        setError(err.message || "Unable to load job details.");
      } finally {
        setLoading(false);
      }
    }
    loadJob();
  }, [jobId]);

  if (loading) {
    return <section className="section"><div className="section-header"><h1 className="section-title">Loading job details…</h1></div></section>;
  }

  if (error) {
    return <section className="simple-page"><div className="info-card"><h1 className="section-title">{error}</h1><Link className="btn-search" to="/jobs">Back to Jobs</Link></div></section>;
  }

  if (!job) {
    return <section className="simple-page"><div className="info-card"><h1 className="section-title">Job not found</h1><Link className="btn-search" to="/jobs">Back to Jobs</Link></div></section>;
  }

  const today = new Date();
  const opensAt = job.applicationStartDate ? new Date(job.applicationStartDate) : null;
  const closesAt = job.applicationEndDate ? new Date(job.applicationEndDate) : null;
  if (closesAt) closesAt.setHours(23, 59, 59, 999);
  const applicationsNotOpen = opensAt && today < opensAt;
  const applicationsClosed = closesAt && today > closesAt;
  const applicationWindowLabel = applicationsNotOpen ? "Applications not open yet" : applicationsClosed ? "Applications closed" : "Applications open";

  async function handleSave() {
    const session = getSession();
    if (!session || session.role !== "candidate") {
      navigate("/login", { state: { from: `/jobs/${jobId}`, role: "candidate", error: "Save karne ke liye candidate login compulsory hai." } });
      return;
    }
    setSaving(true);
    try {
      const result = await toggleJobSaved(jobId);
      setJob((current) => ({
        ...current,
        isSaved: !current.isSaved,
        savedCount: result.data?.savedCount ?? current.savedCount,
      }));
      toast.show(result.message, "success");
    } catch (err) {
      toast.show(err.message || "Unable to save job.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleApply() {
    const session = getSession();
    if (!session || session.role !== "candidate") {
      navigate("/login", { state: { from: `/jobs/${jobId}`, role: "candidate", error: "Apply karne ke liye candidate login compulsory hai." } });
      return;
    }
    setApplying(true);
    try {
      await applyJob(jobId, {});
      toast.show("Your application has been submitted.", "success");
      setJob((current) => ({ ...current, applied: true }));
    } catch (err) {
      toast.show(err.message || "Unable to submit application.", "error");
    } finally {
      setApplying(false);
    }
  }

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <div className="section-label">Job Details</div>
          <h1 className="section-title">{job.title}</h1>
          <p className="section-desc">{job.companyName || job.company} • {job.location || job.address}</p>
        </div>
      </div>

      <div className="detail-grid">
        <article className="form-card animated-card">
          <div className="detail-meta">
            <span>{job.role || job.designation || "Role not specified"}</span>
            <span>{job.genderNeeded ? `Gender: ${job.genderNeeded}` : "Gender open"}</span>
            <span>{job.ageRange ? `Age: ${job.ageRange}` : "Age flexible"}</span>
            <span>{job.salary || "Salary not disclosed"}</span>
            <span>{job.vacancies ? `${job.vacancies} vacancies` : "Vacancies not specified"}</span>
            <span>{job.employmentType ? job.employmentType.replace(/([A-Z])/g, " $1") : "Employment type not specified"}</span>
            <span>{job.savedCount ? `${job.savedCount} saved` : "No saves yet"}</span>
          </div>
          <div className="detail-list">
            <p><b>Skills:</b> {(job.skills || job.tags || []).join(", ") || "Not specified"}</p>
            <p><b>Requirements:</b> {job.requirements || job.description || "Not specified"}</p>
            <p><b>Benefits:</b> {job.benefits || "No details"}</p>
            <p><b>Location:</b> {job.location || job.address || "Not specified"}</p>
            <p><b>Contact:</b> {job.contactNumber || "Not available"}</p>
            <p><b>Map:</b> {job.googleMapLink ? <a href={job.googleMapLink} target="_blank" rel="noreferrer">Open map</a> : "Not provided"}</p>
            <p><b>Apply from:</b> {job.applicationStartDate ? new Date(job.applicationStartDate).toLocaleDateString() : "Not specified"}</p>
            <p><b>Apply until:</b> {job.applicationEndDate ? new Date(job.applicationEndDate).toLocaleDateString() : "Not specified"}</p>
            <p><b>Interview dates:</b> {job.interviewStartDate && job.interviewEndDate ? `${new Date(job.interviewStartDate).toLocaleDateString()} – ${new Date(job.interviewEndDate).toLocaleDateString()}` : "Not specified"}</p>
            <p><b>Interview time:</b> {job.interviewStartTime && job.interviewEndTime ? `${job.interviewStartTime} – ${job.interviewEndTime}` : "Not specified"}</p>
            <p><b>Interview mode:</b> {job.interviewMode || "Not specified"}</p>
            <p><b>Interview details:</b> {job.interviewDetails || "Will be shared after shortlisting"}</p>
          </div>
          <div className="detail-desc">
            <h2 className="section-title">Job Overview</h2>
            <p>{job.description || "No full description available."}</p>
          </div>
        </article>

        <aside className="form-card animated-card">
          <h2 className="form-title">Candidate Actions</h2>
          <p className="form-subtitle">Save this job or submit your application with your candidate profile.</p>
          <div className="job-actions">
            <button className="btn-secondary" type="button" onClick={handleSave} disabled={saving}>
              {job.isSaved ? "Remove Save" : "Save Job"}
            </button>
            <button className="btn-primary" type="button" onClick={handleApply} disabled={applying || job.applied || applicationsNotOpen || applicationsClosed}>
              {job.applied ? "Applied" : applicationsNotOpen || applicationsClosed ? applicationWindowLabel : applying ? "Applying…" : (lang === "en" ? "Apply Now" : "अभी आवेदन करें")}
            </button>
          </div>
          <div className="detail-info">
            <p><strong>Status:</strong> {job.status || "Live"}</p>
            <p><strong>Posted:</strong> {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "Unknown"}</p>
            <p><strong>Applications:</strong> {applicationWindowLabel}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
