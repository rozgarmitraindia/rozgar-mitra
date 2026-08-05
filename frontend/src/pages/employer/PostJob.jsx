import { useState } from "react";
import { apiFetch, getSession } from "../../utils/auth.js";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext.jsx";

const initialJob = {
  title: "", role: "", address: "", googleMapLink: "", vacancies: "1", genderNeeded: "both",
  employmentType: "fullTime", salary: "", requirements: "", skills: "", description: "", benefits: "", contactNumber: "",
  applicationStartDate: "", applicationEndDate: "", interviewStartDate: "", interviewEndDate: "",
  interviewStartTime: "", interviewEndTime: "", interviewMode: "physical", interviewDetails: "",
};

export default function PostJob() {
  const navigate = useNavigate();
  const toast = useToast();
  const [job, setJob] = useState(initialJob);
  const [submitting, setSubmitting] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  function update(field, value) { setJob((current) => ({ ...current, [field]: value })); }

  async function submit(event) {
    event.preventDefault();
    const session = getSession();
    if (!session || session.role !== "employer") return navigate("/login", { state: { role: "employer", error: "Employer login required" } });
    setSubmitting(true);
    try {
      await apiFetch("/employer/jobs", { method: "POST", body: JSON.stringify(job) });
      toast.show("Job submitted for admin review", "success");
      navigate("/employer/jobs");
    } catch (err) {
      toast.show(err.message || "Unable to post the job", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="section">
      <div className="section-header"><div><div className="section-label">Hiring Portal</div><h1 className="section-title">Create a job post</h1><p className="section-desc">Your post will appear publicly after the admin approves it.</p></div></div>
      <form className="form-card animated-card" onSubmit={submit}>
        <div className="section-label">Job basics</div>
        <div className="form-row"><div className="form-group"><label className="form-label">Job title *</label><input className="form-input" value={job.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Customer Support Executive" required /></div><div className="form-group"><label className="form-label">Department / Role</label><input className="form-input" value={job.role} onChange={(e) => update("role", e.target.value)} placeholder="e.g. Customer support" /></div></div>
        <div className="form-row"><div className="form-group"><label className="form-label">Job location *</label><input className="form-input" value={job.address} onChange={(e) => update("address", e.target.value)} placeholder="City, area or full address" required /></div><div className="form-group"><label className="form-label">Google Maps URL <small>(optional)</small></label><input className="form-input" type="url" value={job.googleMapLink} onChange={(e) => update("googleMapLink", e.target.value)} placeholder="https://maps.google.com/..." /></div></div>
        <div className="form-row"><div className="form-group"><label className="form-label">Vacancies *</label><input className="form-input" type="number" min="1" value={job.vacancies} onChange={(e) => update("vacancies", e.target.value)} required /></div><div className="form-group"><label className="form-label">Eligible gender *</label><select className="form-select" value={job.genderNeeded} onChange={(e) => update("genderNeeded", e.target.value)}><option value="both">Male & Female (Both)</option><option value="male">Male</option><option value="female">Female</option></select></div></div>
        <div className="form-row"><div className="form-group"><label className="form-label">Employment type *</label><select className="form-select" value={job.employmentType} onChange={(e) => update("employmentType", e.target.value)}><option value="fullTime">Full time</option><option value="partTime">Part time</option><option value="contract">Contract</option><option value="internship">Internship</option></select></div><div className="form-group"><label className="form-label">Salary *</label><input className="form-input" value={job.salary} onChange={(e) => update("salary", e.target.value)} placeholder="e.g. ₹18,000–₹25,000 / month" required /></div></div>
        <div className="job-schedule-panel">
          <div className="section-label">Application Window</div>
          <p className="form-subtitle">Choose when candidates can submit applications.</p>
          <div className="form-row"><div className="form-group"><label className="form-label">Applications open from *</label><input className="form-input" type="date" min={today} value={job.applicationStartDate} onChange={(e) => update("applicationStartDate", e.target.value)} required /></div><div className="form-group"><label className="form-label">Applications close on *</label><input className="form-input" type="date" min={job.applicationStartDate || today} value={job.applicationEndDate} onChange={(e) => update("applicationEndDate", e.target.value)} required /></div></div>
          <div className="section-label">Planned Interview Window</div>
          <p className="form-subtitle">Candidates will see this expected interview schedule.</p>
          <div className="form-row"><div className="form-group"><label className="form-label">Interview start date *</label><input className="form-input" type="date" min={job.applicationEndDate} value={job.interviewStartDate} onChange={(e) => update("interviewStartDate", e.target.value)} required /></div><div className="form-group"><label className="form-label">Interview end date *</label><input className="form-input" type="date" min={job.interviewStartDate} value={job.interviewEndDate} onChange={(e) => update("interviewEndDate", e.target.value)} required /></div></div>
          <div className="form-row"><div className="form-group"><label className="form-label">Daily start time *</label><input className="form-input" type="time" value={job.interviewStartTime} onChange={(e) => update("interviewStartTime", e.target.value)} required /></div><div className="form-group"><label className="form-label">Daily end time *</label><input className="form-input" type="time" min={job.interviewStartTime} value={job.interviewEndTime} onChange={(e) => update("interviewEndTime", e.target.value)} required /></div></div>
          <div className="form-row"><div className="form-group"><label className="form-label">Interview mode *</label><select className="form-select" value={job.interviewMode} onChange={(e) => update("interviewMode", e.target.value)}><option value="physical">Physical / in-person</option><option value="remote">Remote / online</option><option value="hybrid">Hybrid</option></select></div><div className="form-group"><label className="form-label">Interview details</label><input className="form-input" value={job.interviewDetails} onChange={(e) => update("interviewDetails", e.target.value)} placeholder="Venue, process or meeting information" /></div></div>
        </div>
        <div className="section-label" style={{ marginTop: 10 }}>Requirements</div>
        <div className="form-group"><label className="form-label">Candidate requirements *</label><textarea className="form-textarea" value={job.requirements} onChange={(e) => update("requirements", e.target.value)} placeholder="Education, experience, language and other essential requirements" required /></div>
        <div className="form-group"><label className="form-label">Skills <small>(comma separated)</small></label><input className="form-input" value={job.skills} onChange={(e) => update("skills", e.target.value)} placeholder="Hindi, MS Excel, customer handling" /></div>
        <div className="form-row"><div className="form-group"><label className="form-label">Job description</label><textarea className="form-textarea" value={job.description} onChange={(e) => update("description", e.target.value)} /></div><div className="form-group"><label className="form-label">Benefits / perks</label><textarea className="form-textarea" value={job.benefits} onChange={(e) => update("benefits", e.target.value)} /></div></div>
        <div className="form-group"><label className="form-label">Recruiter support contact</label><input className="form-input" value={job.contactNumber} onChange={(e) => update("contactNumber", e.target.value)} placeholder="Phone number candidates can contact" /></div>
        <button className="btn-primary" type="submit" disabled={submitting}>{submitting ? <><span className="loading-spinner" />Submitting job...</> : "Submit job for review"}</button>
      </form>
    </section>
  );
}
