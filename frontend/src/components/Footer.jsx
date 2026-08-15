import { Link } from "react-router-dom";

const platformLinks = [
  ["Jobs", "/jobs"],
  ["Rooms", "/rooms"],
  ["Dashboard", "/dashboard"],
  ["Admin", "/admin"],
];

const trustItems = [
  "Human moderation desk",
  "OTP + document verification",
  "Rejection always with a reason",
  "Complaints answered in 48h",
];

function BrandMark() {
  return (
    <Link to="/" className="inline-flex items-center gap-3">
      <img className="brand-logo-image size-12 shrink-0" src="/rozgar-mitra-logo.png" alt="Rozgar Mitra logo" />
      <span>
        <span className="block font-display text-[15px] font-bold tracking-tight">ROZGAR MITRA</span>
        <span className="block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Jobs Â· Rooms Â· Growth</span>
      </span>
    </Link>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface text-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <BrandMark />
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
            Rozgar Mitra connects Indiaâ€™s workers with verified jobs, practical rooms, and transparent growth workflows.
          </p>
        </div>
        <div>
          <h3 className="font-display text-sm font-semibold">Platform</h3>
          <div className="mt-4 grid gap-3">
            {platformLinks.map(([label, href]) => (
              <Link key={label} to={href} className="text-sm text-muted-foreground transition hover:text-foreground">
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-display text-sm font-semibold">Trust</h3>
          <ul className="mt-4 grid gap-3 text-sm text-muted-foreground">
            {trustItems.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:px-6">
          <span>Â© 2026 Rozgar Mitra</span>
          <span>Start simple. Launch fast. Grow big.</span>
          <span>Powered By Origin Software</span>
        </div>
      </div>
    </footer>
  );
}
