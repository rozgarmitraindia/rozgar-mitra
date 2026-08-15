import { Instagram, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";

const platformLinks = [["Jobs", "/jobs"], ["Rooms", "/rooms"], ["Dashboard", "/dashboard"], ["Admin", "/admin"]];
const trustItems = ["Human moderation desk", "OTP + document verification", "Rejection always with a reason", "Complaints answered in 48h"];

function BrandMark() {
  return <Link to="/" className="inline-flex items-center gap-3"><img className="brand-logo-image size-12 shrink-0" src="/rozgar-mitra-logo.png" alt="Rozgar Mitra India official logo" /><span><span className="block font-display text-[15px] font-bold tracking-tight">ROZGAR MITRA</span><span className="block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Jobs · Rooms · Growth</span></span></Link>;
}

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface text-foreground">
      <div className="mx-auto grid min-w-0 max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="min-w-0">
          <BrandMark />
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">Rozgar Mitra India की official website—verified jobs, hiring और किराये के rooms के लिए भरोसेमंद platform.</p>
          <div className="mt-5 flex items-center gap-3">
            <a className="grid size-10 place-items-center rounded-xl border border-border bg-card text-muted-foreground transition hover:border-signal hover:text-signal" href="https://www.instagram.com/rozgarmitra.india?utm_source=qr&igsh=djZubGxzNzd1dTAx" target="_blank" rel="noopener noreferrer" aria-label="Rozgar Mitra India on Instagram"><Instagram size={19} /></a>
            <a className="grid size-10 place-items-center rounded-xl border border-border bg-card text-muted-foreground transition hover:border-signal hover:text-signal" href="https://www.linkedin.com/in/rozgarmitra-india-3729b4427?utm_source=share_via&utm_content=profile&utm_medium=member_android" target="_blank" rel="noopener noreferrer" aria-label="Rozgar Mitra India on LinkedIn"><Linkedin size={19} /></a>
          </div>
        </div>
        <div><h3 className="font-display text-sm font-semibold">Platform</h3><div className="mt-4 grid gap-3">{platformLinks.map(([label, href]) => <Link key={label} to={href} className="text-sm text-muted-foreground transition hover:text-foreground">{label}</Link>)}</div></div>
        <div><h3 className="font-display text-sm font-semibold">Trust</h3><ul className="mt-4 grid gap-3 text-sm text-muted-foreground">{trustItems.map((item) => <li key={item}>{item}</li>)}</ul></div>
      </div>
      <div className="border-t border-border"><div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:px-6"><span>© 2026 Rozgar Mitra India</span><span>काम खोजें · कमरा खोजें · भविष्य बनाएं</span><span>Powered By Origin Software</span></div></div>
    </footer>
  );
}
