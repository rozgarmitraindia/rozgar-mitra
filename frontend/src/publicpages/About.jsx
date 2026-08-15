import {
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Eye,
  Home,
  Mail,
  MapPin,
  Phone,
  Rocket,
  Target,
  Users,
} from "lucide-react";

const seekerPoints = [
  "Verified job listings",
  "Local employment opportunities",
  "Simple and easy job search",
  "Connecting candidates with companies",
  "Opportunities for freshers and experienced candidates",
];

const missionPoints = [
  "People find work.",
  "Companies find workers.",
  "People find rooms.",
  "Room owners find tenants.",
];

function AudienceCard({ icon: Icon, title, children, tone }) {
  return (
    <article className="group rounded-3xl border border-border bg-card p-6 shadow-float transition duration-300 hover:-translate-y-1 hover:shadow-lift sm:p-8">
      <span className={`grid size-12 place-items-center rounded-2xl ${tone}`}><Icon className="size-6" /></span>
      <h2 className="mt-5 text-xl font-bold text-foreground">{title}</h2>
      <div className="mt-3 text-sm leading-7 text-muted-foreground">{children}</div>
    </article>
  );
}

export default function About() {
  return (
    <main className="overflow-hidden bg-background">
      <section className="relative border-b border-border bg-gradient-to-br from-[#0B2545] via-[#0754B8] to-[#009BE8] px-4 py-16 text-white sm:px-6 sm:py-24">
        <div className="absolute -right-28 -top-28 size-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 size-96 rounded-full bg-[#009BE8]/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.72fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em]">
              <Users className="size-4" /> About Us
            </span>
            <h1 className="mt-6 max-w-4xl text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">Local opportunities. Trusted connections. One simple platform.</h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-[#FFFFFF] sm:text-lg">
              Welcome to Rozgar Mitra India — a local platform built to connect job seekers, companies, and room owners in one trusted place.
            </p>
            <p className="mt-3 max-w-3xl leading-7 text-[#EAF5FF]">
              Our goal is simple: to make finding local jobs and suitable accommodation easier, faster, and safer.
            </p>
          </div>
          <div className="mx-auto w-full max-w-md rounded-[2rem] border border-white/20 bg-white/95 p-5 shadow-2xl backdrop-blur">
            <img className="aspect-square w-full rounded-3xl object-contain" src="/rozgar-mitra-logo.png" alt="Rozgar Mitra India" />
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-signal">What we do</span>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">Work and accommodation, connected locally</h2>
            <p className="mt-5 leading-8 text-muted-foreground">Rozgar Mitra India helps people discover local and verified job opportunities near them. Companies and local businesses can post openings and connect with suitable candidates.</p>
            <p className="mt-3 leading-8 text-muted-foreground">Room owners can also list available rooms, helping students, employees, workers, and newcomers find accommodation near their workplace or place of education.</p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            <AudienceCard icon={BriefcaseBusiness} title="For Job Seekers" tone="bg-[#EAF5FF] text-[#0754B8]">
              <p>Explore local opportunities according to your skills, location, and work preferences.</p>
              <ul className="mt-4 grid gap-3">
                {seekerPoints.map((point) => <li key={point} className="flex gap-2.5"><CheckCircle2 className="mt-1 size-4 shrink-0 text-verified" /><span>{point}</span></li>)}
              </ul>
            </AudienceCard>

            <AudienceCard icon={Building2} title="For Companies" tone="bg-[#EAF5FF] text-[#0754B8]">
              <p>Companies and local businesses can post vacancies and connect with people looking for employment.</p>
              <p className="mt-3">Whether you are a local business, startup, service provider, or established company, Rozgar Mitra India helps you reach suitable local candidates.</p>
            </AudienceCard>

            <AudienceCard icon={Home} title="For Room Owners" tone="bg-[#EAF5FF] text-[#009BE8]">
              <p>List available rooms with important details such as location, rent, room type, facilities, and contact information.</p>
              <p className="mt-3">This helps people moving for work or education find suitable accommodation more conveniently.</p>
            </AudienceCard>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
          <article className="rounded-3xl bg-[#0B2545] p-7 text-white shadow-lift sm:p-10">
            <span className="grid size-12 place-items-center rounded-2xl bg-white/10"><Target className="size-6" /></span>
            <h2 className="mt-5 text-3xl font-bold">Our Mission</h2>
            <p className="mt-4 leading-8 text-[#EAF5FF]">To build a trusted local ecosystem where opportunity and everyday needs come together.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {missionPoints.map((point) => <div key={point} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold">{point}</div>)}
            </div>
            <p className="mt-6 font-semibold text-[#FFFFFF]">All through one simple platform.</p>
          </article>

          <article className="rounded-3xl border border-border bg-card p-7 shadow-float sm:p-10">
            <span className="grid size-12 place-items-center rounded-2xl bg-[#EAF5FF] text-[#0754B8]"><Eye className="size-6" /></span>
            <h2 className="mt-5 text-3xl font-bold">Our Vision</h2>
            <p className="mt-4 leading-8 text-muted-foreground">We aim to make local employment and accommodation opportunities more accessible across India, helping people connect with opportunities available around them.</p>
            <div className="mt-8 flex items-center gap-4 rounded-2xl bg-muted p-5">
              <Rocket className="size-8 shrink-0 text-signal" />
              <p className="font-semibold leading-7">Find Work. Find a Room. Build Your Future.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <article className="rounded-3xl border border-border bg-card p-7 shadow-float sm:p-9">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-signal">Founder</span>
            <h2 className="mt-3 text-3xl font-extrabold">Sohil Khan</h2>
            <p className="mt-2 font-semibold text-muted-foreground">Founder, Rozgar Mitra India</p>
            <div className="mt-7 h-1.5 w-20 rounded-full bg-gradient-to-r from-[#0754B8] to-[#009BE8]" />
          </article>

          <article className="rounded-3xl border border-border bg-card p-7 shadow-float sm:p-9">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-signal">Contact Us</span>
            <h2 className="mt-3 text-3xl font-extrabold">Let’s connect</h2>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <a className="flex items-center gap-3 rounded-2xl bg-muted p-4 transition hover:bg-accent" href="mailto:rozgarmitraindia@gmail.com"><Mail className="size-5 shrink-0 text-[#0754B8]" /><span className="break-all text-sm font-semibold">rozgarmitraindia@gmail.com</span></a>
              <a className="flex items-center gap-3 rounded-2xl bg-muted p-4 transition hover:bg-accent" href="tel:+919580710941"><Phone className="size-5 shrink-0 text-[#0754B8]" /><span className="text-sm font-semibold">+91 9580710941</span></a>
            </div>
            <div className="mt-4 flex gap-3 rounded-2xl border border-border p-5">
              <MapPin className="mt-1 size-5 shrink-0 text-signal" />
              <address className="text-sm not-italic leading-7 text-muted-foreground">
                <strong className="block text-foreground">Rise Jhansi Incubation Centre Foundation</strong>
                Elite Choraha, Nagar Nigam Rd,<br />Civil Lines, Jhansi,<br />Uttar Pradesh – 284001
              </address>
            </div>
          </article>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 sm:pb-20">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-gradient-to-r from-[#0754B8] to-[#009BE8] px-6 py-10 text-center text-white shadow-lift sm:px-10">
          <h2 className="text-3xl font-extrabold">Rozgar Mitra India</h2>
          <p className="mt-3 text-lg font-semibold text-[#EAF5FF]">Find Work. Find a Room. Build Your Future.</p>
        </div>
      </section>
    </main>
  );
}
