import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-brand">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="tricolor"><div className="tc-orange" /><div className="tc-white" /><div className="tc-green" /></div>
            <span style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 18, fontWeight: 800, color: "rgba(255,255,255,0.9)" }}>रोज़गार मित्र</span>
          </div>
          <p className="footer-tagline">India's trusted local jobs and rooms platform - connecting workers, employers and room owners.</p>
        </div>

        <div className="footer-links">
          <h4>Workers / कामगार</h4>
          <Link to="/join-free">Register Free</Link>
          <Link to="/jobs">Browse Jobs</Link>
          <Link to="/rooms">Browse Rooms</Link>
        </div>

        <div className="footer-links">
          <h4>Employers / नियोक्ता</h4>
          <Link to="/post-job">Post a Job</Link>
          <Link to="/signup">Company Register</Link>
          <Link to="/login">Dashboard Login</Link>
        </div>

        <div className="footer-links">
          <h4>Room Owners / रूम ओनर</h4>
          <Link to="/post-room">Post Room</Link>
          <Link to="/signup">Owner Register</Link>
          <Link to="/contact">Support</Link>
        </div>
      </div>
      <div>© 2026 Rozgar Mitra - Made for India | All rights reserved</div>
    </footer>
  );
}
