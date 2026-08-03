import { useMemo, useRef, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { skills } from "../data/siteData.js";
import { apiFetch, makeReadableId } from "../utils/auth.js";
import { Mail, Smartphone, Lock, Eye, EyeOff } from "lucide-react";

const roleConfig = {
  candidate: { endpoint: "/auth/register/candidate", idPrefix: "candidateid" },
  employer: { endpoint: "/auth/register/employer", idPrefix: "companyid" },
  owner: { endpoint: "/auth/register/room-owner", idPrefix: "ownerid" },
};

export default function Register() {
  const navigate = useNavigate();
  const errorRef = useRef(null);
  const successRef = useRef(null);
  const [role, setRole] = useState("candidate");
  const [candidateName, setCandidateName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const candidateId = useMemo(() => makeReadableId("candidateid", candidateName), [candidateName]);
  const companyId = useMemo(() => makeReadableId("companyid", companyName), [companyName]);
  const ownerId = useMemo(() => makeReadableId("ownerid", propertyName), [propertyName]);

  function toggleSkill(skill) {
    setSelectedSkills((current) => (
      current.includes(skill) ? current.filter((item) => item !== skill) : [...current, skill]
    ));
  }


  useEffect(() => {
    if (error) {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [error]);

  useEffect(() => {
    if (message && !error) {
      successRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [message, error]);

  async function submitRegistration(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const form = new FormData(event.currentTarget);
    const password = form.get("password");
    const confirmPassword = form.get("confirmPassword") || password;
    if (password !== confirmPassword) {
      setLoading(false);
      setError("Password aur confirm password same hone chahiye.");
      return;
    }

    const payload = Object.fromEntries(form.entries());
    delete payload.confirmPassword;
    delete payload.profilePhoto;
    delete payload.resume;
    delete payload.govtId;
    delete payload.companyLogo;
    delete payload.companyDocument;
    delete payload.roomPhotos;
    delete payload.propertyDocument;

    if (role === "candidate") payload.skills = selectedSkills;
    if (role === "employer") payload.email = payload.companyEmail;
    if (role === "owner") payload.propertyName = payload.propertyName || propertyName;

    try {
      const data = await apiFetch(roleConfig[role].endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const email = payload.email || payload.companyEmail;
      setMessage(`${data.message}. OTP email par bhej diya gaya hai.`);
      navigate(`/verify?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }


  return (
    <section className="form-page">
      <div className="section-header">
        <div className="section-label">Join Free</div>
        <h1 className="section-title">Free Registration / Muft Registration</h1>
        <p className="section-desc">OTP sirf email par jayega. Account verify hone se pehle login allowed nahi hoga.</p>
      </div>
      <form className="form-card animated-card" onSubmit={submitRegistration}>
        {error ? <div ref={errorRef} className="login-error">{error}</div> : null}
        {message ? <div ref={successRef} className="login-success">{message}</div> : null}

        <div className="role-tabs">
          <button type="button" className={`role-tab ${role === "candidate" ? "active" : ""}`} onClick={() => setRole("candidate")}>Candidate</button>
          <button type="button" className={`role-tab ${role === "employer" ? "active" : ""}`} onClick={() => setRole("employer")}>Employer</button>
          <button type="button" className={`role-tab ${role === "owner" ? "active" : ""}`} onClick={() => setRole("owner")}>Room Owner</button>
        </div>

        {role === "candidate" && (
          <>
            <h2 className="form-title">Candidate Registration</h2>
            <p className="form-subtitle">Email OTP verification compulsory.</p>
            <div className="form-group"><label className="form-label">Full Name *</label><input className="form-input" name="fullName" value={candidateName} onChange={(event) => setCandidateName(event.target.value)} placeholder="e.g. Sunita Sharma" required /></div>
            <div className="generated-id"><span>Unique User ID</span><input value={candidateId} readOnly /></div>
            <div className="form-row"><div className="form-group"><label className="form-label">Mobile Number *</label><div className="input-icon-group"><span className="input-icon"><Smartphone size={16} /></span><input className="form-input" name="mobile" required /></div></div><div className="form-group"><label className="form-label">Email ID *</label><div className="input-icon-group"><span className="input-icon"><Mail size={16} /></span><input className="form-input" name="email" type="email" required /></div></div></div>
            <div className="form-row"><div className="form-group"><label className="form-label">Address *</label><input className="form-input" name="address" required /></div><div className="form-group"><label className="form-label">Pincode *</label><input className="form-input" name="pincode" required /></div></div>
            <div className="form-group"><label className="form-label">Skills</label><div className="skills-select">{skills.map((skill) => <button type="button" key={skill} className={`skill-chip ${selectedSkills.includes(skill) ? "selected" : ""}`} onClick={() => toggleSkill(skill)}>{skill}</button>)}</div></div>
            <div className="form-row"><div className="form-group"><label className="form-label">Experience</label><input className="form-input" name="experience" /></div><div className="form-group"><label className="form-label">Availability</label><input className="form-input" name="availability" /></div></div>
            <div className="form-group"><label className="form-label">About Yourself</label><textarea className="form-textarea" name="about" /></div>
            <div className="form-row"><div className="form-group"><label className="form-label">Profile Photo</label><input className="form-input" name="profilePhoto" type="file" /></div><div className="form-group"><label className="form-label">Resume Upload</label><input className="form-input" name="resume" type="file" /></div></div>
            <div className="form-group"><label className="form-label">Government ID Upload</label><input className="form-input" name="govtId" type="file" /></div>
            <div className="form-row"><div className="form-group"><label className="form-label">Password</label><div className="input-icon-group password"><span className="input-icon"><Lock size={16} /></span><input className="form-input" name="password" type={showPassword ? "text" : "password"} required /><button type="button" className="input-icon-button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div><div className="form-group"><label className="form-label">Confirm Password</label><div className="input-icon-group password"><span className="input-icon"><Lock size={16} /></span><input className="form-input" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} required /><button type="button" className="input-icon-button" onClick={() => setShowConfirmPassword((current) => !current)} aria-label={showConfirmPassword ? "Hide password" : "Show password"}>{showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div></div>
          </>
        )}

        {role === "employer" && (
          <>
            <h2 className="form-title">Employer Registration</h2>
            <p className="form-subtitle">Company ID unique aur non-editable hogi.</p>
            <div className="form-group"><label className="form-label">Company Name *</label><input className="form-input" name="companyName" value={companyName} onChange={(event) => setCompanyName(event.target.value)} required /></div>
            <div className="generated-id"><span>Unique Company ID</span><input value={companyId} readOnly /></div>
            <div className="form-row"><div className="form-group"><label className="form-label">Company Email *</label><div className="input-icon-group"><span className="input-icon"><Mail size={16} /></span><input className="form-input" name="companyEmail" type="email" required /></div></div><div className="form-group"><label className="form-label">Whatsapp Mobile Number *</label><div className="input-icon-group"><span className="input-icon"><Smartphone size={16} /></span><input className="form-input" name="companyPhone" required /></div></div></div>
            <div className="form-row"><div className="form-group"><label className="form-label">Alternate Number</label><input className="form-input" name="alternateNumber" /></div><div className="form-group"><label className="form-label">Company Location</label><input className="form-input" name="companyLocation" /></div></div>
            <div className="form-group"><label className="form-label">Address</label><textarea className="form-textarea" name="address" /></div>
            <div className="form-group"><label className="form-label">Google Map</label><input className="form-input" name="googleMapLink" placeholder="https://maps.google.com/..." /></div>
            <div className="form-row"><div className="form-group"><label className="form-label">Company Logo</label><input className="form-input" name="companyLogo" type="file" /></div><div className="form-group"><label className="form-label">Proof of Document Upload Cloudinary</label><input className="form-input" name="companyDocument" type="file" /></div></div>
            <div className="form-group"><label className="form-label">Password</label><div className="input-icon-group password"><span className="input-icon"><Lock size={16} /></span><input className="form-input" name="password" type={showPassword ? "text" : "password"} required /><button type="button" className="input-icon-button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
          </>
        )}

        {role === "owner" && (
          <>
            <h2 className="form-title">Room Owner Registration</h2>
            <p className="form-subtitle">Hotel/PG verification document upload compulsory.</p>
            <div className="form-group"><label className="form-label">Hotel / PG Name *</label><input className="form-input" name="propertyName" value={propertyName} onChange={(event) => setPropertyName(event.target.value)} required /></div>
            <div className="generated-id"><span>Unique Room Owner ID</span><input value={ownerId} readOnly /></div>
            <div className="form-row"><div className="form-group"><label className="form-label">Email *</label><div className="input-icon-group"><span className="input-icon"><Mail size={16} /></span><input className="form-input" name="email" type="email" required /></div></div><div className="form-group"><label className="form-label">Phone Number *</label><div className="input-icon-group"><span className="input-icon"><Smartphone size={16} /></span><input className="form-input" name="mobile" required /></div></div></div>
            <div className="form-row"><div className="form-group"><label className="form-label">Alternate Number</label><input className="form-input" name="alternateNumber" /></div><div className="form-group"><label className="form-label">Google Map Link</label><input className="form-input" name="googleMapLink" /></div></div>
            <div className="form-group"><label className="form-label">Address</label><textarea className="form-textarea" name="address" /></div>
            <div className="form-row"><div className="form-group"><label className="form-label">Room Photos</label><input className="form-input" name="roomPhotos" type="file" multiple /></div><div className="form-group"><label className="form-label">Proof of Hotel/PG Document</label><input className="form-input" name="propertyDocument" type="file" /></div></div>
            <div className="form-group"><label className="form-label">Password</label><div className="input-icon-group password"><span className="input-icon"><Lock size={16} /></span><input className="form-input" name="password" type={showPassword ? "text" : "password"} required /><button type="button" className="input-icon-button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
          </>
        )}
        <button className="btn-primary" disabled={loading} type="submit">{loading ? "Please wait..." : "Register & Send OTP on Email"}</button>

        <div style={{ marginTop: 12, textAlign: 'center', fontSize: 14 }}>
          Already have an account? <Link to="/login" style={{ fontWeight: 700 }}>Sign in</Link>
        </div>

      </form>
    </section>
  );
}
