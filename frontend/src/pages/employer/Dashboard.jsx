import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, CalendarCheck, FileWarning, Users } from "lucide-react";
import { getSession } from "../../utils/auth.js";
import { fetchEmployerSummary } from "./employerApi.js";
import { Button } from "../../components/ui/button.jsx";
import { useLanguage } from "../../contexts/LanguageContext.jsx";

export default function EmployerDashboard() {
  const session = getSession();
  const { lang } = useLanguage();
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setSummary(await fetchEmployerSummary());
      } catch (err) {
        setError(err.message || "Unable to load dashboard summary.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const stats = useMemo(() => {
    const values = {
      liveJobs: summary.statusCounts?.live || 0,
      pendingJobs: summary.statusCounts?.pending || 0,
      rejectedJobs: summary.statusCounts?.rejected || 0,
      totalApplications: summary.applicationCounts?.total || 0,
      shortlisted: summary.applicationCounts?.shortlisted || 0,
      interviews: summary.applicationCounts?.interview || 0,
      hired: summary.applicationCounts?.hired || 0,
    };

    return [
      { label: "Live jobs", value: values.liveJobs, path: "/employer/jobs", icon: Briefcase },
      { label: "Pending review", value: values.pendingJobs, path: "/employer/jobs", icon: CalendarCheck },
      { label: "Rejected posts", value: values.rejectedJobs, path: "/employer/jobs", icon: FileWarning },
      { label: "All applicants", value: values.totalApplications, path: "/employer/applications", icon: Users },
      { label: "Shortlisted", value: values.shortlisted, path: "/employer/applications", icon: Users },
      { label: "Interviews", value: values.interviews, path: "/employer/applications", icon: CalendarCheck },
      { label: "Hired", value: values.hired, path: "/employer/applications", icon: Briefcase },
    ];
  }, [summary]);

  const companyName = session?.user?.companyName || session?.companyName || "Company";
  const greeting = lang === "hi" ? `स्वागत है, ${companyName}` : `Welcome, ${companyName}`;

  return (
    <section className="bg-background">
      <div className="mesh-bg border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="inline-flex rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Company command center</div>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl font-bold" data-no-translate translate="no">{greeting}</h1>
              <p className="mt-2 text-muted-foreground">Post jobs, monitor approval, manage candidates and run interviews from one hiring workspace.</p>
            </div>
            <Link className="w-full min-[520px]:w-auto" to="/post-job"><Button className="w-full min-[520px]:w-auto" variant="signal" size="lg">Post a job</Button></Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {error ? <div className="mb-6 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-semibold text-destructive">{error}</div> : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {stats.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.label} to={card.path} className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-float transition hover:-translate-y-0.5 hover:shadow-lift">
                <span className="grid size-10 place-items-center rounded-xl bg-gradient-signal text-signal-foreground"><Icon className="size-5" /></span>
                <span className="mt-4 block break-words text-xs font-semibold uppercase tracking-wide text-muted-foreground">{card.label}</span>
                <strong className="mt-2 block font-display text-3xl font-bold">{card.value}</strong>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.35fr]">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-float">
            <h2 className="font-display text-xl font-semibold">Hiring actions</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Build a structured job post with vacancies, eligibility, location, map link, salary and requirements.</p>
            <div className="mt-6 grid gap-3 min-[480px]:grid-cols-2 lg:grid-cols-1">
              <Link className="min-w-0" to="/post-job"><Button className="h-auto min-h-10 w-full whitespace-normal px-4 py-2.5 leading-snug" variant="signal">Create job post</Button></Link>
              <Link className="min-w-0" to="/employer/jobs"><Button className="h-auto min-h-10 w-full whitespace-normal px-4 py-2.5 leading-snug" variant="outline">View job pipeline</Button></Link>
              <Link className="min-w-0" to="/employer/applications"><Button className="h-auto min-h-10 w-full whitespace-normal px-4 py-2.5 leading-snug" variant="outline">Open applicants</Button></Link>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-float">
            <div className="flex flex-col gap-4 min-[520px]:flex-row min-[520px]:items-center min-[520px]:justify-between">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold">Recent candidate responses</h2>
                <p className="mt-1 text-sm text-muted-foreground">Live backend activity from your jobs.</p>
              </div>
              <Link className="w-full min-[520px]:w-auto" to="/employer/applications"><Button className="w-full min-[520px]:w-auto" variant="outline" size="sm">View all</Button></Link>
            </div>
            {loading ? (
              <p className="mt-6 text-sm text-muted-foreground">Loading recent activity...</p>
            ) : summary.recent?.length ? (
              <>
                <div className="mt-6 grid gap-3 md:hidden">
                  {summary.recent.map((application) => (
                    <Link key={application._id} to="/employer/applications" className="min-w-0 rounded-xl border border-border bg-background p-4">
                      <strong className="block break-words text-sm">{application.candidate?.fullName || application.candidate?.email || "Candidate"}</strong>
                      <p className="mt-1 break-words text-xs text-muted-foreground">{application.job?.title || "-"}</p>
                      <span className="mt-3 inline-flex rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold capitalize text-muted-foreground">{application.status}</span>
                    </Link>
                  ))}
                </div>
                <div className="mt-6 hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="py-3 pr-4 font-semibold">Candidate</th>
                      <th className="py-3 pr-4 font-semibold">Job</th>
                      <th className="py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.recent.map((application) => (
                      <tr key={application._id} className="border-b border-border/70">
                        <td className="py-3 pr-4">{application.candidate?.fullName || application.candidate?.email || "Candidate"}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{application.job?.title || "-"}</td>
                        <td className="py-3 capitalize text-muted-foreground">{application.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </>
            ) : (
              <p className="mt-6 text-sm text-muted-foreground">No applications yet. Your responses will appear here once candidates show interest.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
