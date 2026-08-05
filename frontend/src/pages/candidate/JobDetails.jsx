import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Briefcase, CheckCircle2, MapPin, Upload, Users, Wallet } from "lucide-react";
import { getSession, setSession } from "../../utils/auth.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { useToast } from "../../contexts/ToastContext.jsx";
import { applyJob, fetchCurrentUser, fetchJobDetail, toggleJobSaved, uploadGovernmentId } from "./candidateApi.js";
import { Button } from "../../components/ui/button.jsx";
import { StatusPill } from "../../components/primitives/StatusPill.jsx";

function governmentIdDoc(user) {
  return (user?.documents || []).find((doc) => ["government-id", "govt-id", "aadhaar", "document"].includes(String(doc.type || "").toLowerCase()) && doc.url);
}

export default function JobDetails() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const toast = useToast();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [uploadingGovernmentId, setUploadingGovernmentId] = useState(false);
  const [governmentIdFile, setGovernmentIdFile] = useState(null);
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
    return <section className="section"><div className="section-header"><h1 className="section-title">Loading job details...</h1></div></section>;
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
      let currentUser = await fetchCurrentUser().catch(() => session.user);
      let idDocument = governmentIdDoc(currentUser);

      if (!idDocument?.url) {
        if (!governmentIdFile) {
          toast.show("Government ID upload compulsory hai. Please ID select karke apply karein.", "error");
          return;
        }
        setUploadingGovernmentId(true);
        idDocument = await uploadGovernmentId(governmentIdFile);
        currentUser = {
          ...(currentUser || session.user || {}),
          documents: [...(currentUser?.documents || session.user?.documents || []), idDocument].filter(Boolean),
        };
        setSession({ ...session, user: currentUser }, localStorage.getItem("rozgar_session") !== null);
      }

      await applyJob(jobId, { governmentIdUrl: idDocument.url });
      toast.show("Your application has been submitted.", "success");
      setJob((current) => ({ ...current, applied: true }));
    } catch (err) {
      toast.show(err.message || "Unable to submit application.", "error");
    } finally {
      setUploadingGovernmentId(false);
      setApplying(false);
    }
  }

  const skills = job.skills || job.tags || [];

  return (
    <>
      <section className="mesh-bg border-b border-border">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <Link to="/jobs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />Back to jobs
          </Link>
          <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
            <div>
              <StatusPill status={job.status || "live"} />
              <h1 className="mt-3 font-display text-4xl font-bold leading-tight">{job.title}</h1>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">{job.companyName || job.company || "Employer"}<BadgeCheck className="size-4 text-verified" /></span>
                <span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-signal" />{job.location || job.address || "Location not specified"}</span>
                <span className="inline-flex items-center gap-1.5"><Briefcase className="size-4 text-signal" />{job.employmentType || job.role || "Job role"}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <Button variant="signal" size="lg" onClick={handleApply} disabled={applying || job.applied || applicationsNotOpen || applicationsClosed}>
                {job.applied ? "Applied" : applicationsNotOpen || applicationsClosed ? applicationWindowLabel : uploadingGovernmentId ? "Uploading ID..." : applying ? "Applying..." : (lang === "en" ? "Apply Now" : "अभी आवेदन करें")}
              </Button>
              <Button variant="outline" size="lg" onClick={handleSave} disabled={saving}>{job.isSaved ? "Saved" : "Save"}</Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="grid gap-8">
          <article className="rounded-2xl border border-border bg-card p-6 shadow-float">
            <h2 className="font-display text-xl font-semibold">Job Overview</h2>
            <p className="mt-3 leading-7 text-muted-foreground">{job.description || job.about || "No full description available."}</p>
          </article>

          <article className="rounded-2xl border border-border bg-card p-6 shadow-float">
            <h2 className="font-display text-xl font-semibold">Details</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Info label="Role" value={job.role || job.designation || "Not specified"} />
              <Info label="Salary" value={job.salary || "Salary not disclosed"} />
              <Info label="Vacancies" value={job.vacancies ? `${job.vacancies} vacancies` : "Not specified"} />
              <Info label="Gender" value={job.genderNeeded || "Open"} />
              <Info label="Apply from" value={job.applicationStartDate ? new Date(job.applicationStartDate).toLocaleDateString() : "Not specified"} />
              <Info label="Apply until" value={job.applicationEndDate ? new Date(job.applicationEndDate).toLocaleDateString() : "Not specified"} />
              <Info label="Interview mode" value={job.interviewMode || "Not specified"} />
              <Info label="Contact" value={job.contactNumber || "Not available"} />
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-card p-6 shadow-float">
            <h2 className="font-display text-xl font-semibold">Skills & Requirements</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {skills.length ? skills.map((skill) => <span key={skill} className="rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground">{skill}</span>) : <span className="text-sm text-muted-foreground">Not specified</span>}
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{job.requirements || "Requirements will be shared by employer."}</p>
          </article>
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card p-6 shadow-float lg:sticky lg:top-24">
          <h2 className="font-display text-xl font-semibold">Candidate Actions</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Government ID is compulsory before applying. If it is not already in your profile, upload it here.</p>

          <label className="mt-5 block rounded-2xl border border-dashed border-border bg-surface p-4">
            <span className="inline-flex items-center gap-2 text-sm font-semibold"><Upload className="size-4 text-signal" />Government ID</span>
            <input className="mt-3 w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-gradient-signal file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-signal-foreground" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setGovernmentIdFile(event.target.files?.[0] || null)} />
            <span className="mt-2 block text-xs text-muted-foreground">Aadhaar, voter ID, driving licence, or any valid government ID.</span>
          </label>

          <div className="mt-6 grid gap-3">
            <Button variant="outline" onClick={handleSave} disabled={saving}>{job.isSaved ? "Remove Save" : "Save Job"}</Button>
            <Button variant="signal" onClick={handleApply} disabled={applying || job.applied || applicationsNotOpen || applicationsClosed}>
              {job.applied ? "Applied" : uploadingGovernmentId ? "Uploading ID..." : applying ? "Applying..." : "Apply Now"}
            </Button>
          </div>

          <div className="mt-6 rounded-xl bg-verified/10 p-4 text-xs leading-5 text-muted-foreground">
            <CheckCircle2 className="mb-2 size-4 text-verified" />
            Your uploaded ID and profile documents will be visible to this employer in the applicants panel after you apply.
          </div>

          <div className="mt-5 grid gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2"><Wallet className="size-4 text-signal" />{job.salary || "Salary not disclosed"}</span>
            <span className="inline-flex items-center gap-2"><Users className="size-4 text-signal" />{job.vacancies || 1} vacancies</span>
            <span className="inline-flex items-center gap-2"><Briefcase className="size-4 text-signal" />{applicationWindowLabel}</span>
          </div>
        </aside>
      </section>
    </>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl bg-muted p-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <p className="mt-1 text-sm font-semibold">{value || "-"}</p>
    </div>
  );
}
