import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { categories, rooms as sampleRooms } from "../data/siteData.js";
import { fetchJobs, fetchRooms } from "../pages/candidate/candidateApi.js";

// Maps a real Job document from the backend to the same shape the JobCard component expects.
function mapJob(job) {
  return {
    id: job._id,
    icon: "💼",
    title: job.title,
    company: job.companyName || job.employerName || "Employer",
    location: job.address || "Location not specified",
    salary: job.salary || "Salary not disclosed",
    tags: job.skills && job.skills.length ? job.skills.slice(0, 3) : [job.role].filter(Boolean),
  };
}

// Maps a real Room document from the backend to the same shape the room card markup expects.
function mapRoom(room) {
  return {
    id: room._id,
    icon: "🏠",
    title: room.title || room.propertyName,
    owner: room.propertyName || "Room Owner",
    location: room.address || "Location not specified",
    rent: room.rent || "Rent not disclosed",
    tags: room.amenities && room.amenities.length ? room.amenities.slice(0, 3) : [room.roomType].filter(Boolean),
  };
}

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
  const [jobs, setJobs] = useState([]);
  const [rooms, setRooms] = useState(sampleRooms);
  const [loadingLive, setLoadingLive] = useState(true);

  // ⚡ COUNTERS START FROM LOW VALUES (500, 100, 50) ⚡
  const [workersCount, setWorkersCount] = useState(500);
  const [jobsCount, setJobsCount] = useState(100);
  const [roomsCount, setRoomsCount] = useState(50);

  useEffect(() => {
    let cancelled = false;
    async function loadLiveData(background = false) {
      try {
        const [liveJobs, liveRooms] = await Promise.all([fetchJobs(), fetchRooms()]);
        if (cancelled) return;
        setJobs(liveJobs.map(mapJob));
        if (liveRooms.length) setRooms(liveRooms.map(mapRoom));
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

  // 📈 INITIAL SMOOTH COUNT-UP ANIMATION FROM 500 TO 10,000+ ON LOAD
  useEffect(() => {
    const targetWorkers = 10000;
    const targetJobs = 2000;
    const targetRooms = 850;

    const duration = 3000; // 3 seconds smooth climb
    const frameDuration = 1000 / 60;
    const totalFrames = Math.round(duration / frameDuration);
    let frame = 0;

    const timer = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      // Smooth deceleration curve
      const easeOut = 1 - Math.pow(1 - progress, 3);

      setWorkersCount(Math.floor(500 + (targetWorkers - 500) * easeOut));
      setJobsCount(Math.floor(100 + (targetJobs - 100) * easeOut));
      setRoomsCount(Math.floor(50 + (targetRooms - 50) * easeOut));

      if (frame >= totalFrames) {
        clearInterval(timer);
      }
    }, frameDuration);

    return () => clearInterval(timer);
  }, []);

  // 🔄 REAL-TIME CONTINUOUS INCREMENT (5 seconds ke bad 1-2 new users add hone lagenge)
  useEffect(() => {
    const liveInterval = setInterval(() => {
      setWorkersCount((prev) => prev + Math.floor(Math.random() * 3) + 1);

      if (Math.random() > 0.6) setJobsCount((prev) => prev + 1);
      if (Math.random() > 0.7) setRoomsCount((prev) => prev + 1);
    }, 4500);

    return () => clearInterval(liveInterval);
  }, []);

  return (
    <>
      {/* 🌟 ENHANCED BEAUTIFUL HERO SECTION 🌟 */}
      <section className="hero" style={{ textAlign: "center", display: "flex", justifyContent: "center", padding: "4rem 1rem" }}>
        <div className="hero-content animated-card" style={{ maxWidth: "850px", margin: "0 auto", width: "100%" }}>
          
          <div className="hero-badge" style={{ display: "inline-flex", alignItems: "center", gap: "6px", margin: "0 auto 1rem auto" }}>
            <span className="live-dot"></span> 🇮🇳 India's Trusted Local Platform
          </div>

          <h1 className="hero-title" data-no-translate style={{ textAlign: "center" }}>
            रोज़गार मित्र - <span>Jobs, Rooms & Growth</span>
          </h1>

          {/* ⚡ BEAUTIFUL SCROLLING HINDI MARQUEE TEXT ⚡ */}
          <div className="hero-ticker" style={{ 
            overflow: "hidden", 
            whiteSpace: "nowrap", 
            margin: "1.2rem auto", 
            padding: "8.5px 16px",
            background: "rgba(255, 255, 255, 0.75)",
            backdropFilter: "blur(8px)",
            borderRadius: "50px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
            maxWidth: "680px"
          }}>
            <p className="hero-subtitle marquee-text" style={{ 
              display: "inline-block", 
              margin: 0,
              fontSize: "1.05rem",
              fontWeight: "500",
              color: "var(--gray-800, #1f2937)",
              animation: "scrollHindi 15s linear infinite" 
            }}>
              ✨ कामगारों को verified jobs, employers को trusted candidates, और room owners को genuine bookings दिलाने वाला simple और fast platform. ✨
            </p>
          </div>

          {/* 🔍 CENTER-ALIGNED SEARCH BOX 🔍 */}
          <div className="search-box" style={{ 
            margin: "2rem auto", 
            justifyContent: "center", 
            maxWidth: "650px", 
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" 
          }}>
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

          {/* 📈 ANIMATED INCREASING HERO STATS 📈 */}
          <div className="hero-stats" style={{ justifyContent: "center" }}>
            <div>
              <span className="stat-num count-anim" key={workersCount}>
                {workersCount.toLocaleString()}+
              </span>
              <span className="stat-label">Verified Workers</span>
            </div>
            <div>
              <span className="stat-num count-anim" key={jobsCount}>
                {jobsCount.toLocaleString()}+
              </span>
              <span className="stat-label">Active Jobs</span>
            </div>
            <div>
              <span className="stat-num count-anim" key={roomsCount}>
                {roomsCount.toLocaleString()}+
              </span>
              <span className="stat-label">Rooms & PG</span>
            </div>
            <div>
              <span className="stat-num" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <span className="live-pulse-dot"></span> Live
              </span>
              <span className="stat-label">Smart Alerts</span>
            </div>
          </div>

        </div>
      </section>

      {/* INLINE CSS FOR SLIDE-UP ANIMATION & MARQUEE */}
      <style>{`
        @keyframes scrollHindi {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .hero-ticker:hover .marquee-text {
          animation-play-state: paused;
        }

        /* ⬆️ BOTTOM TO TOP SLIDE-UP NUMBER ANIMATION */
        .count-anim {
          display: inline-block;
          animation: slideUpNum 0.35s ease-out forwards;
        }

        @keyframes slideUpNum {
          0% {
            opacity: 0.3;
            transform: translateY(12px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Green Live Pulse Dot Style */
        .live-dot, .live-pulse-dot {
          width: 8px;
          height: 8px;
          background-color: #22c55e;
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
          animation: pulseGreen 1.8s infinite;
        }
        @keyframes pulseGreen {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
          }
        }
      `}</style>

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
        {loadingLive ? <p className="section-desc">Loading live jobs...</p> : jobs.length ? <div className="jobs-grid">{jobs.slice(0, 3).map((job) => <JobCard key={job.id} job={job} />)}</div> : <div className="form-card"><p className="section-desc" style={{ margin: 0 }}>No approved jobs are live right now.</p></div>}
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
