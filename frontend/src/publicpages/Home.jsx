import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  CheckCircle2,
  Home as HomeIcon,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { fetchJobs, fetchRooms } from "../pages/candidate/candidateApi.js";
import { Button } from "../components/ui/button.jsx";
import { Input } from "../components/ui/input.jsx";
import { Reveal } from "../components/primitives/Reveal.jsx";
import { StatCard } from "../components/primitives/StatCard.jsx";
import { StatusPill } from "../components/primitives/StatusPill.jsx";

const roleCards = [
  [Users, "Candidate", "Verified jobs dekho, save/apply karo, aur room options bhi browse karo.", "/register"],
  [Briefcase, "Employer", "Jobs post karo, applications manage karo, aur hiring pipeline track karo.", "/register"],
  [HomeIcon, "Room Owner", "Rooms list karo, visit requests dekho, aur bookings manage karo.", "/register"],
  [ShieldCheck, "Admin", "Moderation, verification, complaints aur reports ka control center.", "/admin"],
];

const trustCards = [
  [ShieldCheck, "Document-checked employers", "Employer verification state candidates ko clearly dikhta hai."],
  [BadgeCheck, "Owner-verified rooms", "Rooms approval ke baad hi public browsing me trusted signal aata hai."],
  [Users, "Reason on rejection", "Admin rejection silent nahi hota; reason ke saath status update hota hai."],
  [Sparkles, "Live status clarity", "Jobs aur rooms me live, pending, rejected states visible rahte hain."],
];

const categories = ["Technology", "Sales", "Manufacturing", "Logistics", "Healthcare", "Hospitality"];

function getJobId(job) {
  return job._id || job.id;
}

function getRoomId(room) {
  return room._id || room.id;
}

function getSalary(job) {
  if (job.salary) return job.salary;
  if (job.salaryMin || job.salaryMax) return [job.salaryMin, job.salaryMax].filter(Boolean).join(" - ");
  return "Salary not disclosed";
}

export default function Home() {
  const [jobs, setJobs] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loadingLive, setLoadingLive] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadLiveData(background = false) {
      try {
        const [liveJobs, liveRooms] = await Promise.all([fetchJobs(), fetchRooms()]);
        if (cancelled) return;
        setJobs(liveJobs);
        setRooms(liveRooms);
      } catch (err) {
        console.error("Failed to load live jobs/rooms", err);
      } finally {
        if (!cancelled && !background) setLoadingLive(false);
      }
    }

    loadLiveData();
    const refresh = () => loadLiveData(true);
    const interval = window.setInterval(refresh, 5000);
    window.addEventListener("focus", refresh);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return (
    <>
      <section className="relative overflow-hidden bg-background">
        <div className="mesh-bg absolute inset-0" />
        <div className="rule-grid absolute inset-0 opacity-50" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:pt-24">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]">
              <Sparkles className="size-3.5 text-signal" />
              Verified jobs & rooms
            </div>
            <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.02] sm:text-6xl lg:text-7xl">
              <span className="block">Find work and a roof</span>
              <span className="block bg-gradient-signal bg-clip-text text-transparent">Verified by humans</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              Rozgar Mitra brings trusted employers, verified rooms, and visible moderation into one premium platform for India’s mobile workforce.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.12, ease: [0.16, 1, 0.3, 1] }} className="mt-10 max-w-3xl rounded-3xl border border-border bg-card p-2 shadow-lift">
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
              <button className="relative h-10 rounded-xl bg-gradient-signal text-sm font-semibold text-signal-foreground">Jobs</button>
              <Link to="/rooms" className="grid h-10 place-items-center rounded-xl text-sm font-semibold text-muted-foreground transition hover:text-foreground">Rooms</Link>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 p-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="h-12 rounded-xl border-transparent bg-muted pl-9" placeholder="Search role, city, company, or room area" />
              </div>
              <Link to="/jobs"><Button variant="signal" size="xl">Search <ArrowRight className="size-4" /></Button></Link>
            </div>
          </motion.div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard value={jobs.length || 4820} label="Live jobs" />
            <StatCard value={rooms.length || 2136} label="Rooms" />
            <StatCard value={912} label="Employers" />
            <StatCard value={387} label="Hires" />
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
          <Reveal>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Trust built for India’s real work movement</h2>
            <p className="mt-4 text-muted-foreground">
              Public browsing remains open. Apply, save, post, and booking actions move users through login at the right time.
            </p>
            <Link to="/jobs"><Button className="mt-6" variant="ink">Browse live jobs <ArrowRight className="size-4" /></Button></Link>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2">
            {trustCards.map(([Icon, title, text], index) => (
              <Reveal key={title} delay={index * 0.06} className="rounded-2xl border border-border bg-card p-5 shadow-float">
                <Icon className="size-5 text-signal" />
                <h3 className="mt-3 font-display text-base font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHead title="Latest approved jobs" subtitle="Backend se live approved jobs yahin public browse honge." href="/jobs" />
        {loadingLive ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-muted-foreground shadow-float">Loading live jobs...</div>
        ) : jobs.length ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {jobs.slice(0, 3).map((job, index) => <Reveal key={getJobId(job)} delay={index * 0.05}><LiveJobCard job={job} /></Reveal>)}
          </div>
        ) : (
          <EmptyState text="No approved jobs are live right now." />
        )}
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <SectionHead title="Verified rooms & PG" subtitle="Rooms backend se connected hain aur approval ke baad public me dikhenge." href="/rooms" />
          {rooms.length ? (
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rooms.slice(0, 3).map((room, index) => <Reveal key={getRoomId(room)} delay={index * 0.05}><LiveRoomCard room={room} /></Reveal>)}
            </div>
          ) : (
            <EmptyState text="No approved rooms are live right now." />
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <Reveal>
          <h2 className="font-display text-3xl font-bold">Browse by work category</h2>
          <p className="mt-2 text-sm text-muted-foreground">Quick entry points for the most common India hiring flows.</p>
        </Reveal>
        <div className="mt-8 flex flex-wrap gap-2">
          {categories.map((category) => (
            <Link key={category} to="/jobs" className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:border-signal hover:text-foreground">
              {category}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <Reveal><h2 className="font-display text-3xl font-bold">Choose your role</h2></Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {roleCards.map(([Icon, title, text, href], index) => (
            <Reveal key={title} delay={index * 0.05}>
              <Link to={href} className="group flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-float transition-all hover:-translate-y-0.5 hover:shadow-lift">
                <span className="grid size-11 place-items-center rounded-xl bg-gradient-signal text-signal-foreground"><Icon className="size-5" /></span>
                <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{text}</p>
                <span className="mt-auto inline-flex gap-1.5 pt-4 text-sm font-semibold text-signal">Continue <ArrowRight className="size-4 transition group-hover:translate-x-1" /></span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <Reveal className="relative overflow-hidden rounded-3xl bg-gradient-ink px-8 py-14 text-background sm:px-14">
          <div className="mesh-bg absolute inset-0 opacity-70" />
          <div className="relative max-w-xl">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Start simple. Launch fast. Grow big.</h2>
            <p className="mt-4 opacity-80">Candidate, employer, aur room owner flows existing backend ke saath connected rahenge.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register"><Button variant="signal" size="xl">Join Now</Button></Link>
              <Link to="/jobs"><Button variant="glass" size="xl">Browse Jobs</Button></Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}

function SectionHead({ title, subtitle, href }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
      <div>
        <h2 className="font-display text-3xl font-bold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <Link to={href}><Button variant="outline" size="sm">View all</Button></Link>
    </div>
  );
}

function LiveJobCard({ job }) {
  const id = getJobId(job);
  const skills = job.skills || job.tags || [job.role].filter(Boolean);

  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-float transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to={`/jobs/${id}`} className="font-display text-lg font-semibold leading-tight hover:text-signal">{job.title}</Link>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            {job.companyName || job.company || job.employerName || "Employer"}
            {job.companyVerified || job.verificationStatus === "verified" ? <BadgeCheck className="size-4 text-verified" /> : null}
          </p>
        </div>
        <StatusPill status={job.status || "live"} />
      </div>
      <div className="mt-5 grid gap-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2"><MapPin className="size-4 text-signal" />{job.location || job.address || "Location not specified"}</span>
        <span className="inline-flex items-center gap-2"><Wallet className="size-4 text-signal" />{getSalary(job)}</span>
        <span className="inline-flex items-center gap-2"><Users className="size-4 text-signal" />{job.vacancies || 1} vacancies</span>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {skills.slice(0, 4).map((skill) => <span key={skill} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{skill}</span>)}
      </div>
      <div className="mt-auto flex gap-2 pt-6">
        <Link className="flex-1" to={`/jobs/${id}`}><Button className="w-full" variant="signal">Apply</Button></Link>
        <Link className="flex-1" to={`/jobs/${id}`}><Button className="w-full" variant="outline">View</Button></Link>
      </div>
    </article>
  );
}

function LiveRoomCard({ room }) {
  const id = getRoomId(room);
  const amenities = room.amenities || room.tags || [room.roomType].filter(Boolean);

  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-float transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to={`/rooms/${id}`} className="font-display text-lg font-semibold leading-tight hover:text-signal">{room.title || room.propertyName || "Verified room"}</Link>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            {room.ownerVerified || room.verificationStatus === "verified" ? "Owner verified" : "Owner check pending"}
            {room.ownerVerified || room.verificationStatus === "verified" ? <BadgeCheck className="size-4 text-verified" /> : null}
          </p>
        </div>
        <StatusPill status={room.status || "live"} />
      </div>
      <div className="mt-5 grid gap-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2"><MapPin className="size-4 text-signal" />{room.location || room.address || "Location not specified"}</span>
        <span className="inline-flex items-center gap-2"><Wallet className="size-4 text-signal" />{room.rent || "Rent not disclosed"}</span>
        <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-verified" />Moderated listing</span>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {amenities.slice(0, 4).map((amenity) => <span key={amenity} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{amenity}</span>)}
      </div>
      <div className="mt-auto flex gap-2 pt-6">
        <Link className="flex-1" to={`/rooms/${id}`}><Button className="w-full" variant="signal">Book Visit</Button></Link>
        <Link className="flex-1" to={`/rooms/${id}`}><Button className="w-full" variant="outline">View</Button></Link>
      </div>
    </article>
  );
}

function EmptyState({ text }) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
      {text}
    </div>
  );
}
