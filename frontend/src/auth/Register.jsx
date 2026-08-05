import { useMemo, useRef, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, Smartphone } from "lucide-react";
import { skills } from "../data/siteData.js";
import { apiUpload, makeReadableId } from "../utils/auth.js";
import { Button } from "../components/ui/button.jsx";
import { cn } from "../lib/utils.js";

const roleConfig = {
  candidate: { label: "Candidate", endpoint: "/auth/register/candidate", idPrefix: "candidateid" },
  employer: { label: "Employer", endpoint: "/auth/register/employer", idPrefix: "companyid" },
  owner: { label: "Room Owner", endpoint: "/auth/register/room-owner", idPrefix: "ownerid" },
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
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [uploadFileNames, setUploadFileNames] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const generatedId = useMemo(() => {
    if (role === "candidate") return makeReadableId("candidateid", candidateName);
    if (role === "employer") return makeReadableId("companyid", companyName);
    return makeReadableId("ownerid", propertyName);
  }, [candidateName, companyName, propertyName, role]);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [error]);

  useEffect(() => {
    if (message && !error) successRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [message, error]);

  function toggleSkill(skill) {
    setSelectedSkills((current) => current.includes(skill) ? current.filter((item) => item !== skill) : [...current, skill]);
  }

  async function submitRegistration(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const form = new FormData(event.currentTarget);
    const password = form.get("password");
    const confirmPassword = form.get("confirmPassword");
    const email = form.get("email") || form.get("companyEmail");

    if (password !== confirmPassword) {
      setLoading(false);
      setError("Password and confirm password must match.");
      return;
    }

    form.delete("confirmPassword");
    if (role === "candidate") form.append("skills", JSON.stringify(selectedSkills));
    if (role === "employer") form.append("email", String(form.get("companyEmail") || ""));

    const uploadFiles = ["profilePhoto", "resume", "govtId", "companyLogo", "companyDocument", "roomPhotos", "propertyDocument"]
      .flatMap((name) => Array.from(form.getAll(name)).filter((file) => file instanceof File && file.size > 0));
    const hasFiles = uploadFiles.length > 0;
    setUploadFileNames(uploadFiles.map((file) => file.name));
    setUploadingDocuments(hasFiles);

    try {
      const data = await apiUpload(roleConfig[role].endpoint, form);
      setMessage(`${data.message}. OTP has been sent to your email.`);
      navigate(`/verify?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setUploadingDocuments(false);
      setUploadFileNames([]);
      setLoading(false);
    }
  }

  return (
    <section className="mesh-bg min-h-[calc(100vh-8rem)] border-b border-border px-4 py-12 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div className="lg:sticky lg:top-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <ShieldCheck className="size-3.5 text-verified" />
            Verified onboarding
          </div>
          <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight sm:text-5xl">Create your Rozgar Mitra account</h1>
          <p className="mt-4 text-muted-foreground">Register as a candidate, employer, or room owner. Email OTP and admin verification keep the platform trusted.</p>
          <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-float">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Generated ID</span>
            <strong className="mt-2 block break-all font-display text-lg">{generatedId}</strong>
          </div>
        </div>

        <form className="relative rounded-3xl border border-border bg-card p-6 shadow-lift sm:p-8" onSubmit={submitRegistration}>
          {uploadingDocuments ? (
            <div className="absolute inset-0 z-20 grid place-items-center rounded-3xl bg-card/85 p-6 backdrop-blur-sm">
              <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 text-center shadow-lift">
                <Loader2 className="mx-auto size-8 animate-spin text-signal" />
                <h2 className="mt-4 font-display text-xl font-semibold">Documents uploading...</h2>
                <p className="mt-2 text-sm text-muted-foreground">Please wait. Files are being attached to your profile for admin verification.</p>
                {uploadFileNames.length ? (
                  <div className="mt-4 grid gap-2 text-left">
                    {uploadFileNames.map((name) => (
                      <div key={name} className="truncate rounded-lg bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">{name}</div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          {error ? <div ref={errorRef} className="mb-5 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-semibold text-destructive">{error}</div> : null}
          {message ? <div ref={successRef} className="mb-5 rounded-2xl border border-verified/20 bg-verified/10 p-4 text-sm font-semibold text-foreground">{message}</div> : null}

          <div className="grid grid-cols-3 gap-2">
            {Object.entries(roleConfig).map(([value, config]) => (
              <button
                type="button"
                key={value}
                onClick={() => setRole(value)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                  role === value ? "border-signal bg-signal/15 text-foreground" : "border-border bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {config.label}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-5">
            {role === "candidate" ? (
              <CandidateFields candidateName={candidateName} setCandidateName={setCandidateName} selectedSkills={selectedSkills} toggleSkill={toggleSkill} />
            ) : null}
            {role === "employer" ? <EmployerFields companyName={companyName} setCompanyName={setCompanyName} /> : null}
            {role === "owner" ? <OwnerFields propertyName={propertyName} setPropertyName={setPropertyName} /> : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <PasswordField label="Password" name="password" show={showPassword} onToggle={() => setShowPassword((current) => !current)} />
              <PasswordField label="Confirm Password" name="confirmPassword" show={showConfirmPassword} onToggle={() => setShowConfirmPassword((current) => !current)} />
            </div>

            <Button variant="signal" size="xl" disabled={loading}>
              {loading ? (uploadingDocuments ? "Uploading documents..." : "Creating account...") : "Register & Send OTP"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account? <Link to="/login" className="font-semibold text-signal">Sign in</Link>
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}

function CandidateFields({ candidateName, setCandidateName, selectedSkills, toggleSkill }) {
  return (
    <>
      <Field label="Full Name" name="fullName" value={candidateName} onChange={(event) => setCandidateName(event.target.value)} placeholder="e.g. Sunita Sharma" required />
      <div className="grid gap-5 sm:grid-cols-2">
        <IconField label="Mobile Number" name="mobile" icon={Smartphone} placeholder="10 digit mobile number" required />
        <IconField label="Email ID" name="email" icon={Mail} type="email" placeholder="candidate@example.com" required />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Date of Birth" name="dateOfBirth" type="date" />
        <SelectField label="Gender" name="gender" options={[["", "Select gender"], ["male", "Male"], ["female", "Female"], ["other", "Other"], ["preferNotToSay", "Prefer not to say"]]} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Address" name="address" placeholder="House, area, city" required />
        <Field label="Pincode" name="pincode" placeholder="226001" required />
      </div>
      <div>
        <label className="text-sm font-semibold">Skills</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {skills.map((skill) => (
            <button type="button" key={skill} className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold transition", selectedSkills.includes(skill) ? "border-signal bg-signal/15" : "border-border bg-muted text-muted-foreground")} onClick={() => toggleSkill(skill)}>
              {skill}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Experience" name="experience" placeholder="2 years / Fresher" />
        <Field label="Availability" name="availability" placeholder="Immediate / 15 days" />
      </div>
      <TextArea label="About Yourself" name="about" placeholder="Write a short profile summary" />
      <div className="grid gap-5 sm:grid-cols-3">
        <FileField label="Profile Photo" name="profilePhoto" accept="image/*" />
        <FileField label="Resume Upload" name="resume" />
        <FileField label="Government ID" name="govtId" accept="image/jpeg,image/png,image/webp,application/pdf" required />
      </div>
    </>
  );
}

function EmployerFields({ companyName, setCompanyName }) {
  return (
    <>
      <Field label="Company Name" name="companyName" value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="e.g. Shakti Auto Components" required />
      <div className="grid gap-5 sm:grid-cols-2">
        <IconField label="Company Email" name="companyEmail" icon={Mail} type="email" placeholder="hr@company.com" required />
        <IconField label="WhatsApp Mobile Number" name="companyPhone" icon={Smartphone} placeholder="10 digit company number" required />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Alternate Number" name="alternateNumber" placeholder="Optional contact number" />
        <Field label="Company Location" name="companyLocation" placeholder="City, State" />
      </div>
      <TextArea label="Address" name="address" placeholder="Company complete address" />
      <Field label="Google Map Link" name="googleMapLink" placeholder="https://maps.google.com/..." />
      <div className="grid gap-5 sm:grid-cols-2">
        <FileField label="Company Logo" name="companyLogo" accept="image/*" />
        <FileField label="Proof Document" name="companyDocument" accept="image/jpeg,image/png,image/webp,application/pdf" />
      </div>
    </>
  );
}

function OwnerFields({ propertyName, setPropertyName }) {
  return (
    <>
      <Field label="Hotel / PG Name" name="propertyName" value={propertyName} onChange={(event) => setPropertyName(event.target.value)} placeholder="e.g. Shree Worker Stay" required />
      <div className="grid gap-5 sm:grid-cols-2">
        <IconField label="Email" name="email" icon={Mail} type="email" placeholder="owner@example.com" required />
        <IconField label="Phone Number" name="mobile" icon={Smartphone} placeholder="10 digit mobile number" required />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Alternate Number" name="alternateNumber" placeholder="Optional contact number" />
        <Field label="Google Map Link" name="googleMapLink" placeholder="https://maps.google.com/..." />
      </div>
      <TextArea label="Address" name="address" placeholder="Property complete address" />
      <div className="grid gap-5 sm:grid-cols-2">
        <FileField label="Room Photos" name="roomPhotos" accept="image/*" multiple />
        <FileField label="Hotel/PG Proof Document" name="propertyDocument" accept="image/jpeg,image/png,image/webp,application/pdf" required />
      </div>
    </>
  );
}

function Field({ label, className, ...props }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <input className={cn("mt-2 h-12 w-full rounded-xl border border-border bg-muted px-3 text-sm outline-none transition focus:ring-2 focus:ring-signal", className)} {...props} />
    </label>
  );
}

function IconField({ icon: Icon, label, className, ...props }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <span className="relative mt-2 block">
        <Icon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input className={cn("h-12 w-full rounded-xl border border-border bg-muted px-3 pl-10 text-sm outline-none transition focus:ring-2 focus:ring-signal", className)} {...props} />
      </span>
    </label>
  );
}

function PasswordField({ label, name, show, onToggle }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <span className="relative mt-2 block">
        <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input className="h-12 w-full rounded-xl border border-border bg-muted px-3 pl-10 pr-10 text-sm outline-none transition focus:ring-2 focus:ring-signal" name={name} type={show ? "text" : "password"} placeholder="Minimum 8 characters" minLength={8} required />
        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={onToggle} aria-label={show ? "Hide password" : "Show password"}>
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </span>
    </label>
  );
}

function SelectField({ label, name, options }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <select className="mt-2 h-12 w-full rounded-xl border border-border bg-muted px-3 text-sm outline-none transition focus:ring-2 focus:ring-signal" name={name} defaultValue="">
        {options.map(([value, labelText]) => <option key={labelText} value={value}>{labelText}</option>)}
      </select>
    </label>
  );
}

function TextArea({ label, ...props }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <textarea className="mt-2 min-h-28 w-full rounded-xl border border-border bg-muted px-3 py-3 text-sm outline-none transition focus:ring-2 focus:ring-signal" {...props} />
    </label>
  );
}

function FileField({ label, ...props }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <input className="mt-2 w-full rounded-xl border border-border bg-muted px-3 py-3 text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-gradient-signal file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-signal-foreground" type="file" {...props} />
    </label>
  );
}
