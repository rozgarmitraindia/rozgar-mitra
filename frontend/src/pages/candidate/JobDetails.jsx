import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Briefcase, CalendarCheck2, CheckCircle2, Clock, Lock, MapPin, Phone, Upload, Users, Wallet } from "lucide-react";
import { getSession, setSession } from "../../utils/auth.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { useToast } from "../../contexts/ToastContext.jsx";
import { applyJob, fetchCurrentUser, fetchJobDetail, toggleJobSaved, uploadGovernmentId } from "./candidateApi.js";
import { Button } from "../../components/ui/button.jsx";
import { StatusPill } from "../../components/primitives/StatusPill.jsx";

function governmentIdDoc(user) {
  return (user?.documents || []).find((doc) => ["government-id", "govt-id", "aadhaar", "document"].includes(String(doc.type || "").toLowerCase()) && doc.url);
}

function formatDate(value) {
  if (!value) return "Not specified";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatEmploymentType(value) {
  const labels = { fullTime: "Full time", partTime: "Part time", contract: "Contract", internship: "Internship", remote: "Remote / online", physical: "Physical / in-person", hybrid: "Hybrid" };
  return labels[value] || value || "Not specified";
}

function formatGender(value) {
  const labels = { both: "Male & Female (Both)", male: "Male", female: "Female" };
  return labels[value] || value || "Open";
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
        setJob(await fetchJobDetail(jobId));
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
  const skills = job.skills || job.tags || [];
  const showContact = Boolean(job.applied && job.contactNumber);

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
      const refreshed = await fetchJobDetail(jobId).catch(() => null);
      toast.show("Your application has been submitted.", "success");
      setJob((current) => ({ ...(current || {}), ...(refreshed || {}), applied: true }));
    } catch (err) {
      toast.show(err.message || "Unable to submit application.", "error");
    } finally {
      setUploadingGovernmentId(false);
      setApplying(false);
    }
  }

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
                <span className="inline-flex items-center gap-1.5"><Briefcase className="size-4 text-signal" />{formatEmploymentType(job.employmentType) || job.role || "Job role"}</span>
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
            <h2 className="font-display text-xl font-semibold">Job overview</h2>
            <p className="mt-3 leading-7 text-muted-foreground">{job.description || job.about || "No full description available."}</p>
          </article>

          <article className="rounded-2xl border border-border bg-card p-6 shadow-float">
            <h2 className="font-display text-xl font-semibold">Job details</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Info label="Post ID" value={job.postId || "Not specified"} />
              <Info label="Role / department" value={job.role || job.designation || "Not specified"} />
              <Info label="Employment type" value={formatEmploymentType(job.employmentType)} />
              <Info label="Salary" value={job.salary || "Salary not disclosed"} />
              <Info label="Vacancies" value={job.vacancies ? `${job.vacancies} vacancies` : "Not specified"} />
              <Info label="Eligible gender" value={formatGender(job.genderNeeded)} />
              <Info label="Posted on" value={formatDate(job.createdAt)} />
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-card p-6 shadow-float">
            <h2 className="font-display text-xl font-semibold">Location & contact</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Info label="Job location" value={job.address || job.location || "Location not specified"} />
              <Info label="Google Maps" value={job.googleMapLink ? "Open map" : "Not shared"} href={job.googleMapLink} />
              <Info label="Recruiter support contact" value={showContact ? job.contactNumber : "Apply to unlock contact number"} locked={!showContact} />
            </div>
            {!showContact ? (
              <div className="mt-4 rounded-xl border border-signal/30 bg-signal/10 p-4 text-sm text-muted-foreground">
                <Lock className="mb-2 size-4 text-signal" />
                Contact number candidate application submit hone ke baad hi visible hoga.
              </div>
            ) : null}
          </article>

          <article className="rounded-2xl border border-border bg-card p-6 shadow-float">
            <h2 className="font-display text-xl font-semibold">Application window</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Info label="Applications open from" value={formatDate(job.applicationStartDate)} />
              <Info label="Applications close on" value={formatDate(job.applicationEndDate)} />
              <Info label="Current status" value={applicationWindowLabel} />
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-card p-6 shadow-float">
            <h2 className="font-display text-xl font-semibold">Planned interview window</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Info label="Interview start date" value={formatDate(job.interviewStartDate)} />
              <Info label="Interview end date" value={formatDate(job.interviewEndDate)} />
              <Info label="Daily start time" value={job.interviewStartTime || "Not specified"} />
              <Info label="Daily end time" value={job.interviewEndTime || "Not specified"} />
              <Info label="Interview mode" value={formatEmploymentType(job.interviewMode)} />
              <Info label="Interview details" value={job.interviewDetails || "Will be shared by employer"} />
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-card p-6 shadow-float">
            <h2 className="font-display text-xl font-semibold">Skills & requirements</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {skills.length ? skills.map((skill) => <span key={skill} className="rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground">{skill}</span>) : <span className="text-sm text-muted-foreground">Not specified</span>}
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{job.requirements || "Requirements will be shared by employer."}</p>
          </article>

          <article className="rounded-2xl border border-border bg-card p-6 shadow-float">
            <h2 className="font-display text-xl font-semibold">Benefits / perks</h2>
            <p className="mt-3 leading-7 text-muted-foreground">{job.benefits || "No benefits shared by employer."}</p>
          </article>
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card p-6 shadow-float lg:sticky lg:top-24">
          <h2 className="font-display text-xl font-semibold">Candidate actions</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Government ID is compulsory before applying. If it is not already in your profile, upload it here.</p>

          <label className="mt-5 block rounded-2xl border border-dashed border-border bg-surface p-4">
            <span className="inline-flex items-center gap-2 text-sm font-semibold"><Upload className="size-4 text-signal" />Government ID</span>
            <input className="mt-3 w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-gradient-signal file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-signal-foreground" type="file" accept="image/*,application/pdf,.doc,.docx" onChange={(event) => setGovernmentIdFile(event.target.files?.[0] || null)} />
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
            <span className="inline-flex items-center gap-2"><CalendarCheck2 className="size-4 text-signal" />{formatDate(job.interviewStartDate)} to {formatDate(job.interviewEndDate)}</span>
            <span className="inline-flex items-center gap-2"><Clock className="size-4 text-signal" />{job.interviewStartTime || "-"} - {job.interviewEndTime || "-"}</span>
            <span className="inline-flex items-center gap-2"><Phone className="size-4 text-signal" />{showContact ? job.contactNumber : "Contact after apply"}</span>
          </div>
        </aside>
      </section>
    </>
  );
}

function Info({ label, value, href, locked = false }) {
  return (
    <div className="rounded-xl bg-muted p-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {href ? (
        <a className="mt-1 block text-sm font-semibold text-signal hover:underline" href={href} target="_blank" rel="noreferrer">{value || "Open"}</a>
      ) : (
        <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold">{locked ? <Lock className="size-3.5 text-signal" /> : null}{value || "-"}</p>
      )}
    </div>
  );
}
