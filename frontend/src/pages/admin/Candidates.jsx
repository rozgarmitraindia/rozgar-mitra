import { useEffect, useState } from "react";
import { RefreshCw, Send, Users } from "lucide-react";
import ListModule from "./ListModule.jsx";
import { adminFetch } from "./adminApi.js";
import { useToast } from "../../contexts/ToastContext.jsx";

export default function Candidates() {
  const [groups, setGroups] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [selectedEmployers, setSelectedEmployers] = useState({});
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState("");
  const [error, setError] = useState("");
  const toast = useToast();

  async function loadGroups() {
    setLoading(true);
    setError("");
    try {
      const result = await adminFetch("/admin/talent/groups");
      const data = result.data || result;
      setGroups(data.items || []);
      setEmployers(data.employers || []);
      setSelectedEmployers((current) => {
        const next = { ...current };
        (data.items || []).forEach((group) => {
          if (!next[group.key] && group.matchedEmployers?.[0]?._id) next[group.key] = group.matchedEmployers[0]._id;
        });
        return next;
      });
    } catch (err) {
      setError(err.message || "Unable to load talent groups.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadGroups(); }, []);

  async function shareGroup(group) {
    const employerId = selectedEmployers[group.key];
    if (!employerId) return toast.show("Please select a company.", "error");
    setSharing(group.key);
    try {
      const result = await adminFetch("/admin/talent/share", {
        method: "POST",
        body: JSON.stringify({
          employerId,
          candidateIds: group.candidates.map((candidate) => candidate._id),
          skill: group.skill,
          companyPreference: group.companyPreference,
        }),
      });
      toast.show(result.message || "Candidate group shared", "success");
    } catch (err) {
      toast.show(err.message || "Unable to share candidate group", "error");
    } finally {
      setSharing("");
    }
  }

  return (
    <div className="grid gap-8">
      <section className="form-card admin-module-card">
        <div className="admin-list-head">
          <div>
            <div className="section-label">Talent grouping</div>
            <h1 className="form-title">Skill + company preference groups</h1>
            <p className="section-desc">Candidates with the same skill and preferred company appear together. Share the complete group with a verified company.</p>
          </div>
          <button className="btn-secondary admin-icon-button" type="button" onClick={loadGroups} disabled={loading}><RefreshCw size={16} />Refresh</button>
        </div>
        {error ? <div className="login-error">{error}</div> : null}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {groups.map((group) => (
            <article className="rounded-2xl border border-border bg-surface p-5" key={group.key}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Users size={15} />{group.count} candidates</div>
                  <h2 className="mt-2 font-display text-xl font-bold">{group.skill}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Preferred company: <b className="text-foreground">{group.companyPreference}</b></p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {group.candidates.slice(0, 6).map((candidate) => <span className="rounded-full border border-border bg-card px-3 py-1 text-xs" key={candidate._id}>{candidate.fullName}</span>)}
                {group.count > 6 ? <span className="px-2 py-1 text-xs text-muted-foreground">+{group.count - 6} more</span> : null}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
                <select className="form-select" value={selectedEmployers[group.key] || ""} onChange={(event) => setSelectedEmployers((current) => ({ ...current, [group.key]: event.target.value }))}>
                  <option value="">Select verified company</option>
                  {employers.map((employer) => <option value={employer._id} key={employer._id}>{employer.companyName || employer.fullName} ({employer.immutableId})</option>)}
                </select>
                <button className="btn-search" type="button" disabled={sharing === group.key} onClick={() => shareGroup(group)}><Send size={15} />{sharing === group.key ? "Sharing..." : `Share all ${group.count}`}</button>
              </div>
            </article>
          ))}
          {!loading && !groups.length ? <p className="section-desc">No matching groups yet. Groups appear after verified candidates add skills and company preferences.</p> : null}
          {loading ? <p className="section-desc">Loading candidate groups...</p> : null}
        </div>
      </section>
      <ListModule moduleKey="candidates" />
    </div>
  );
}
