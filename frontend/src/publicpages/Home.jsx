import { Link } from "react-router-dom";
import { categories, jobs, rooms } from "../data/siteData.js";

function CategoryCard({ item }) {
  return (
    <Link to="/jobs" className="category-card animated-card">
      <span className="cat-icon">{item[0]}</span>
      <span className="cat-name-hi">{item[1]}</span>
      <span className="cat-name-en">{item[2]}</span>
      <span className="cat-count">{item[3]}</span>
    </Link>
  );
}

function JobCard({ job }) {
  return (
    <article className="job-card animated-card">
      <Link to={`/jobs/${job.id}`} className="job-card-header">
        <div className="job-icon">{job.icon}</div>
        <div>
          <h3 className="job-title">{job.title}</h3>
          <div className="job-company">{job.company} • {job.location}</div>
        </div>
      </Link>
      <div className="job-tags">{job.tags.map((tag) => <span key={tag} className="job-tag">{tag}</span>)}</div>
      <div className="job-footer">
        <span className="job-salary">{job.salary}</span>
        <Link to={`/jobs/${job.id}`} className="btn-wa">📱 Apply</Link>
      </div>
    </article>
  );
}

const overviewBlocks = [
  {
    title: "Candidate Flow",
    icon: "👤",
    items: ["Register", "Email OTP", "Complete Profile", "Search Job", "Apply", "Employer Review", "Interview", "Selection"],
  },
  {
    title: "Employer Flow",
    icon: "🏢",
    items: ["Register", "Admin Verification", "Post Job", "Admin Approval", "Job Live", "Review Applications", "Hire"],
  },
  {
    title: "Room Owner Flow",
    icon: "🏠",
    items: ["Register", "Verification", "Add Room Photos", "Admin Approval", "Room Live", "Visit Requests", "Booking"],
  },
  {
    title: "User Room Booking",
    icon: "🛏️",
    items: ["Browse Rooms", "View Photos", "Login/Register", "Book Visit Slot", "Submit Request", "WhatsApp Chat", "Finalize Booking"],
  },
];

const platformFeatures = [
  ["Room Booking Features", "Multiple Photos, Google Map, Visit Slot Booking, WhatsApp Chat, Inquiry Form, Availability Status"],
  ["Admin Module", "Manage Users, Verify Companies, Approve Jobs & Rooms, Reports, Complaints, Notifications"],
  ["Notifications", "Email Notifications, Push Notifications, In-app Notification Bell"],
  ["Extra Features", "Wishlist, Resume Upload, Vacancy Counter, Gender Preference, Skills Filter, AI Ready Architecture"],
  ["Technology Stack", "React, Tailwind CSS, Node.js, Express.js, MongoDB, JWT, Email OTP, Cloudinary, Firebase FCM, Resend"],
  ["Why Rozgar Mitra?", "All-in-one platform, verified and secure, easy to use, smart notifications, growth for everyone"],
];

function PlatformOverview() {
  return (
    <section className="section" style={{ background: "var(--gray-50)" }}>
      <div className="section-header">
        <div className="section-label">Project Overview</div>
        <h2 className="section-title">One Platform - Jobs, Rooms & Growth</h2>
        <p className="section-desc">Candidate, Employer, Room Owner aur Admin ek hi verified platform par kaam karenge.</p>
      </div>

      <div className="jobs-grid">
        {overviewBlocks.map((block) => (
          <article className="job-card animated-card" key={block.title}>
            <div className="job-card-header">
              <div className="job-icon">{block.icon}</div>
              <div>
                <h3 className="job-title">{block.title}</h3>
                <div className="job-company">Verified workflow</div>
              </div>
            </div>
            <div className="job-tags">{block.items.map((item) => <span className="job-tag" key={item}>{item}</span>)}</div>
          </article>
        ))}
      </div>

      <div className="category-grid" style={{ maxWidth: 1120, marginTop: 24 }}>
        {platformFeatures.map(([title, text]) => (
          <article className="category-card animated-card" key={title}>
            <span className="cat-name-hi">{title}</span>
            <span className="cat-name-en" style={{ lineHeight: 1.6 }}>{text}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-content animated-card">
          <div className="hero-badge">🇮🇳 India's Trusted Local Platform</div>
          <h1 className="hero-title">रोज़गार मित्र - <span>Jobs, Rooms & Growth</span></h1>
          <p className="hero-subtitle">
            कामगारों को verified jobs, employers को trusted candidates, और room owners को genuine bookings दिलाने वाला simple और fast platform.
          </p>
          <div className="search-box">
            <input placeholder="काम खोजें / Search jobs" />
            <select defaultValue="">
              <option value="" disabled>City / शहर</option>
              <option>Lucknow</option>
              <option>Delhi</option>
              <option>Mumbai</option>
              <option>Kanpur</option>
            </select>
            <Link className="btn-search" to="/jobs">Search</Link>
          </div>
          <div className="hero-stats">
            <div><span className="stat-num">10K+</span><span className="stat-label">Verified Workers</span></div>
            <div><span className="stat-num">2K+</span><span className="stat-label">Active Jobs</span></div>
            <div><span className="stat-num">850+</span><span className="stat-label">Rooms & PG</span></div>
            <div><span className="stat-num">24x7</span><span className="stat-label">Smart Alerts</span></div>
          </div>
        </div>
      </section>

      <PlatformOverview />

      <section className="section">
        <div className="section-header">
          <div className="section-label">Popular Categories</div>
          <h2 className="section-title">किस काम के लिए खोज रहे हैं?</h2>
          <p className="section-desc">Browse jobs by category - same simple UI as client preview.</p>
        </div>
        <div className="category-grid">{categories.map((item) => <CategoryCard key={item[2]} item={item} />)}</div>
      </section>

      <section className="section" style={{ background: "var(--gray-50)" }}>
        <div className="section-header">
          <div className="section-label">Latest Jobs</div>
          <h2 className="section-title">आज की नई नौकरियां</h2>
          <p className="section-desc">Admin approved jobs live on platform.</p>
        </div>
        <div className="jobs-grid">{jobs.slice(0, 3).map((job) => <JobCard key={job.id} job={job} />)}</div>
      </section>

      <section className="section">
        <div className="section-header">
          <div className="section-label">Rooms</div>
          <h2 className="section-title">Verified Rooms & PG</h2>
          <p className="section-desc">Room owner listing admin review ke baad hi live hogi.</p>
        </div>
        <div className="rooms-grid">
          {rooms.map((room) => (
            <article className="room-card animated-card" key={room.id}>
              <Link to={`/rooms/${room.id}`} className="job-card-header"><div className="room-icon">{room.icon}</div><div><h3 className="room-title">{room.title}</h3><div className="room-location">{room.owner} • {room.location}</div></div></Link>
              <div className="job-tags">{room.tags.map((tag) => <span className="job-tag" key={tag}>{tag}</span>)}</div>
              <div className="job-footer"><span className="room-price">{room.rent}</span><Link className="btn-wa" to={`/rooms/${room.id}`}>Book Visit</Link></div>
            </article>
          ))}
        </div>
      </section>

      <section className="section hiw-bg">
        <div className="section-header">
          <div className="section-label">How It Works</div>
          <h2 className="section-title" style={{ color: "white" }}>Complete Workflow / पूरा प्रोसेस</h2>
        </div>
        <div className="hiw-grid">
          {[
            ["1", "Register / रजिस्टर", "Candidate, employer, room owner account with OTP/email verification."],
            ["2", "Admin Verification", "Documents and details verified before live access."],
            ["3", "Apply / Book", "Candidate applies for job or user books room visit."],
            ["4", "Interview / Visit", "Employer schedules interview, room owner accepts visit."],
          ].map((step) => (
            <div className="hiw-step animated-card" key={step[0]}>
              <div className="step-num">{step[0]}</div>
              <div className="step-title">{step[1]}</div>
              <p className="step-desc">{step[2]}</p>
            </div>
          ))}
        </div>
      </section>
      
    </>
  );
}
