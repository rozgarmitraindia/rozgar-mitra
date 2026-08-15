import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BadgeCheck, Briefcase, MapPin, Search, SlidersHorizontal, Users, Wallet } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { useToast } from "../../contexts/ToastContext.jsx";
import { getSession } from "../../utils/auth.js";
import { fetchJobs, toggleJobSaved } from "./candidateApi.js";
import { Button } from "../../components/ui/button.jsx";
import { Input } from "../../components/ui/input.jsx";
import { StatusPill } from "../../components/primitives/StatusPill.jsx";
import { cn } from "../../lib/utils.js";

const categories = ["All", "Technology", "Sales", "Manufacturing", "Logistics", "Healthcare", "Hospitality"];

function getId(job) {
  return job._id || job.id;
}

function getSalary(job) {
  return job.salary || [job.salaryMin, job.salaryMax].filter(Boolean).join(" - ") || "Salary not disclosed";
}

export default function BrowseJobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { lang } = useLanguage();
  const toast = useToast();

  useEffect(() => {
    let active = true;
    async function loadJobs(background = false) {
      if (!background) setLoading(true);
      setError("");
      try {
        const items = await fetchJobs();
        if (active) setJobs(items);
      } catch (err) {
        setError(err.message || "Unable to load jobs.");
      } finally {
        if (active && !background) setLoading(false);
      }
    }
    loadJobs();
    const refresh = () => loadJobs(true);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const filtered = useMemo(() => jobs.filter((job) => {
    const text = `${job.title} ${job.companyName || job.company || ""} ${job.location || job.address || ""} ${(job.skills || job.tags || []).join(" ")} ${job.role || ""}`.toLowerCase();
    const qmatch = q.trim() === "" || text.includes(q.toLowerCase());
    const catmatch = category === "All" || text.includes(category.toLowerCase());
    return qmatch && catmatch;
  }), [jobs, q, category]);

  async function handleSave(job) {
    const session = getSession();
    if (!session) {
      navigate("/login", { state: { from: `/jobs/${getId(job)}`, role: "candidate", error: "Save karne ke liye login required hai." } });
      return;
    }
    try {
      const result = await toggleJobSaved(getId(job));
      setJobs((items) => items.map((item) => {
        if (String(getId(item)) !== String(getId(job))) return item;
        return { ...item, isSaved: !item.isSaved, savedCount: result.data?.savedCount ?? item.savedCount };
      }));
      toast.show(result.message, "success");
    } catch (err) {
      toast.show(err.message || "Unable to update save status.", "error");
    }
  }

  return (
    <>
      <section className="mesh-bg border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <h1 className="font-display text-4xl font-bold">Find verified jobs</h1>
          <p className="mt-2 text-muted-foreground">
            {lang === "en" ? "Search, filter, save and apply after login." : "Naukri browse karo, save/apply ke liye login karo."}
          </p>
          <div className="mt-8 grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-2xl border border-border bg-card p-2 shadow-float">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-11 rounded-xl border-transparent bg-muted pl-9" placeholder="Search job, city, skill, or company" value={q} onChange={(event) => setQ(event.target.value)} />
            </div>
            <Button variant="signal" size="lg"><SlidersHorizontal className="size-4" />Sort / Filter</Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
                  category === item ? "border-signal bg-signal/15 text-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {error ? <div className="mb-6 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-semibold text-destructive">{error}</div> : null}
        <p className="text-sm text-muted-foreground"><strong className="text-foreground">{filtered.length}</strong> results found</p>
        {loading ? (
          <div className="mt-6 rounded-2xl border border-border bg-card p-10 text-muted-foreground shadow-float">Loading jobs...</div>
        ) : filtered.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((job) => <JobBrowseCard key={getId(job)} job={job} onSave={() => handleSave(job)} />)}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-border p-16 text-center">
            <h2 className="text-lg font-semibold">No jobs match this filter</h2>
            <p className="mt-2 text-sm text-muted-foreground">Try another category or clear your search phrase.</p>
            <Button className="mt-6" variant="outline" onClick={() => { setCategory("All"); setQ(""); }}>Clear filters</Button>
          </div>
        )}
      </section>
    </>
  );
}

function JobBrowseCard({ job, onSave }) {
  const id = getId(job);
  const skills = job.skills || job.tags || [job.role].filter(Boolean);

  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-float transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to={`/jobs/${id}`} className="font-display text-lg font-semibold leading-tight hover:text-signal">{job.title}</Link>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            {job.companyName || job.company || "Company"}
            {job.companyVerified || job.verificationStatus === "verified" ? <BadgeCheck className="size-4 text-verified" /> : null}
          </p>
        </div>
        <StatusPill status={job.status || "live"} />
      </div>
      <div className="mt-5 grid gap-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2"><MapPin className="size-4 text-signal" />{job.location || job.address || "Location not specified"}</span>
        <span className="inline-flex items-center gap-2"><Wallet className="size-4 text-signal" />{getSalary(job)}</span>
        <span className="inline-flex items-center gap-2"><Users className="size-4 text-signal" />{job.vacancies || 1} vacancies</span>
        <span className="inline-flex items-center gap-2"><Briefcase className="size-4 text-signal" />{job.employmentType || job.role || "Job role"}</span>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {skills.slice(0, 4).map((skill) => <span key={skill} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{skill}</span>)}
      </div>
      {job.applicationEndDate ? <p className="mt-4 text-xs font-semibold text-muted-foreground">Apply by {new Date(job.applicationEndDate).toLocaleDateString()}</p> : null}
      <div className="mt-auto flex gap-2 pt-6">
        <Button className="flex-1" variant="outline" onClick={onSave}>{job.isSaved ? "Saved" : "Save"}</Button>
        <Link className="flex-1" to={`/jobs/${id}`}><Button className="w-full" variant="signal">View</Button></Link>
      </div>
    </article>
  );
}
