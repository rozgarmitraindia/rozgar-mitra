import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Briefcase, CalendarCheck, Home, UserRound } from "lucide-react";
import { getSession } from "../../utils/auth.js";
import { fetchCandidateApplications, fetchCandidateSummary } from "./candidateApi.js";
import { Button } from "../../components/ui/button.jsx";

export default function Dashboard() {
  const session = getSession();
  const [summary, setSummary] = useState({});
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [summaryData, apps] = await Promise.all([fetchCandidateSummary(), fetchCandidateApplications()]);
        setSummary(summaryData);
        setApplications(apps);
      } catch (err) {
        console.error(err);
        setError(err.message || "Unable to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const stats = useMemo(() => ([
    { label: "Saved Jobs", value: summary.savedJobs || 0, link: "/saved-jobs", icon: Briefcase },
    { label: "Saved Rooms", value: summary.savedRooms || 0, link: "/rooms", icon: Home },
    { label: "Applied Jobs", value: summary.applications || 0, link: "/applied-jobs", icon: CalendarCheck },
    { label: "Interviews", value: summary.interviews || 0, link: "/interviews", icon: UserRound },
    { label: "Unread Alerts", value: summary.unreadNotifications || 0, link: "/notifications", icon: Bell },
  ]), [summary]);

  return (
    <section className="bg-background">
      <div className="mesh-bg border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="inline-flex rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Candidate Dashboard</div>
          <h1 className="mt-4 font-display text-4xl font-bold">Welcome back, {session?.name || session?.user?.fullName || "Candidate"}</h1>
          <p className="mt-2 text-muted-foreground">Your profile, jobs, rooms, applications and alerts in one verified workspace.</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {error ? <div className="mb-6 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-semibold text-destructive">{error}</div> : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {stats.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.label} to={card.link} className="rounded-2xl border border-border bg-card p-5 shadow-float transition hover:-translate-y-0.5 hover:shadow-lift">
                <span className="grid size-10 place-items-center rounded-xl bg-gradient-signal text-signal-foreground"><Icon className="size-5" /></span>
                <span className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{card.label}</span>
                <strong className="mt-2 block font-display text-3xl font-bold">{card.value}</strong>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-float">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-semibold">Recent Applications</h2>
                <p className="mt-1 text-sm text-muted-foreground">Latest backend application activity.</p>
              </div>
              <Link to="/applied-jobs"><Button variant="outline" size="sm">View all</Button></Link>
            </div>
            {loading ? (
              <p className="mt-6 text-sm text-muted-foreground">Loading your activity...</p>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="py-3 pr-4 font-semibold">Job</th>
                      <th className="py-3 pr-4 font-semibold">Status</th>
                      <th className="py-3 pr-4 font-semibold">Employer</th>
                      <th className="py-3 font-semibold">Applied</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.slice(0, 6).map((application) => (
                      <tr key={application._id} className="border-b border-border/70">
                        <td className="py-3 pr-4">{application.job?.title || "Unknown"}</td>
                        <td className="py-3 pr-4 capitalize text-muted-foreground">{application.status}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{application.employer?.companyName || application.employer?.fullName || "-"}</td>
                        <td className="py-3 text-muted-foreground">{application.createdAt ? new Date(application.createdAt).toLocaleDateString() : "-"}</td>
                      </tr>
                    ))}
                    {!applications.length && !loading ? <tr><td className="py-6 text-muted-foreground" colSpan="4">No applications yet. Apply to jobs from the browse page.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-float">
            <h2 className="font-display text-xl font-semibold">Quick Actions</h2>
            <p className="mt-1 text-sm text-muted-foreground">Common candidate flows.</p>
            <div className="mt-6 grid gap-3">
              <Link to="/jobs"><Button className="w-full" variant="signal">Browse Jobs</Button></Link>
              <Link to="/saved-jobs"><Button className="w-full" variant="outline">Saved Jobs</Button></Link>
              <Link to="/notifications"><Button className="w-full" variant="outline">Notifications</Button></Link>
              <Link to="/profile"><Button className="w-full" variant="outline">Profile</Button></Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
