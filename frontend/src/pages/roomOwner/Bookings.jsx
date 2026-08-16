import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, X } from "lucide-react";
import { confirmRoomBooking, fetchRoomOwnerBookings } from "./roomOwnerApi.js";
import { useToast } from "../../contexts/ToastContext.jsx";

function displayDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleDateString("en-IN");
}

function ageFromDob(dateOfBirth) {
  if (!dateOfBirth) return "-";
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.valueOf())) return "-";
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  if (today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) age -= 1;
  return age >= 0 ? `${age} years` : "-";
}

function roomId(room) {
  return room?.publicId || room?.roomId || room?._id || "-";
}

function visitStatus(item) {
  return item.visitStatus || item.status || "completed";
}

function bookingStatus(item) {
  return item.bookingStatus || "notBooked";
}

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [bookingTarget, setBookingTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const toast = useToast();

  async function load() {
    setLoading(true);
    setError("");
    try {
      setBookings(await fetchRoomOwnerBookings());
    } catch (err) {
      setError(err.message || "Unable to load bookings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function confirmBooking(payload) {
    await confirmRoomBooking(bookingTarget._id, payload);
    toast.show("Room booking confirmed and occupancy updated", "success");
    setBookingTarget(null);
    await load();
  }

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <div className="section-label">Bookings</div>
          <h1 className="section-title">Room Booking Desk</h1>
          <p className="section-desc">Completed visits appear here. Approve actual room booking, assign occupancy, room and bed.</p>
        </div>
      </div>

      {error ? <div className="login-error">{error}</div> : null}

      <div className="room-owner-booking-cards">
        {loading ? <div className="form-card text-muted-foreground">Loading bookings...</div> : null}
        {!loading && bookings.length ? bookings.map((item) => {
          const room = item.room || {};
          const left = Number(room.availableOccupancy ?? room.maxOccupancy ?? 0);
          const isBooked = bookingStatus(item) === "booked";
          return (
            <article key={item._id} className="form-card room-owner-booking-card">
              <div className="room-owner-card-head">
                <div className="min-w-0">
                  <div className="section-label">{roomId(room)}</div>
                  <h2 className="form-title mt-2">{room.propertyName || room.title || "Room"}</h2>
                  <p className="section-desc">{room.type || room.roomType || "Room"} | {left} left</p>
                </div>
                <span className="status-pill">{bookingStatus(item)}</span>
              </div>
              <div className="room-owner-info-grid">
                <Info label="Candidate" value={item.user?.fullName || item.user?.email || "Candidate"} />
                <Info label="Candidate ID" value={item.user?.immutableId || item.user?._id || "-"} />
                <Info label="Mobile" value={item.user?.mobile || item.user?.phone || "-"} />
                <Info label="Visit status" value={visitStatus(item)} />
                <Info label="Occupancy" value={isBooked ? `${item.bookedOccupancy || 1} booked (${room.availableOccupancy || 0} left)` : `${left} available`} />
              </div>
              <div className="room-owner-action-grid">
                <button className="btn-secondary" type="button" onClick={() => setSelectedCandidate(item.user)}>Candidate profile</button>
                <Link className="btn-secondary" to={`/post-room?roomId=${room._id}`}>Room <ExternalLink size={13} /></Link>
                <button className="btn-primary" type="button" disabled={isBooked || left <= 0} onClick={() => setBookingTarget(item)}>
                  {isBooked ? "Booked" : "Confirm booked"}
                </button>
              </div>
            </article>
          );
        }) : null}
        {!loading && !bookings.length ? <div className="form-card text-center">No completed visits unlocked yet.</div> : null}
      </div>

      <div className="admin-table-wrap room-owner-booking-table">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Candidate ID</th>
              <th>Mobile</th>
              <th>Room ID</th>
              <th>Room</th>
              <th>Visit Status</th>
              <th>Room Booked Status</th>
              <th>Occupancy</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9">Loading bookings...</td></tr>
            ) : bookings.length ? bookings.map((item) => {
              const room = item.room || {};
              const left = Number(room.availableOccupancy ?? room.maxOccupancy ?? 0);
              const isBooked = bookingStatus(item) === "booked";
              return (
                <tr key={item._id}>
                  <td><button className="btn-secondary" type="button" onClick={() => setSelectedCandidate(item.user)}>{item.user?.fullName || item.user?.email || "Candidate"}</button></td>
                  <td>{item.user?.immutableId || item.user?._id || "-"}</td>
                  <td>{item.user?.mobile || item.user?.phone || "-"}</td>
                  <td>
                    <Link className="btn-secondary" to={`/post-room?roomId=${room._id}`}>
                      {roomId(room)} <ExternalLink size={13} />
                    </Link>
                  </td>
                  <td>
                    <div className="font-semibold">{room.propertyName || room.title || "Room"}</div>
                    <div className="section-desc">{room.type || room.roomType || "Room"} | {left} left</div>
                  </td>
                  <td>{visitStatus(item)}</td>
                  <td>{bookingStatus(item)}</td>
                  <td>{isBooked ? `${item.bookedOccupancy || 1} booked (${room.availableOccupancy || 0} left)` : `${left} available`}</td>
                  <td>
                    <button className="btn-primary" type="button" disabled={isBooked || left <= 0} onClick={() => setBookingTarget(item)}>
                      {isBooked ? "Booked" : "Confirm booked"}
                    </button>
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan="9">No completed visits unlocked yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedCandidate ? <CandidateModal candidate={selectedCandidate} onClose={() => setSelectedCandidate(null)} /> : null}
      {bookingTarget ? <ConfirmBookingModal item={bookingTarget} onClose={() => setBookingTarget(null)} onConfirm={confirmBooking} /> : null}
    </section>
  );
}

function ConfirmBookingModal({ item, onClose, onConfirm }) {
  const [occupancy, setOccupancy] = useState(1);
  const [assignedUnit, setAssignedUnit] = useState("");
  const [assignedBed, setAssignedBed] = useState("");
  const [note, setNote] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const roomRent = Number(String(item.room?.rent || "").replace(/[^\d.]/g, "")) || 0;
  const roomMaintenance = Number(String(item.room?.maintenance || "").replace(/[^\d.]/g, "")) || 0;
  const roomDeposit = Number(String(item.room?.deposit || "").replace(/[^\d.]/g, "")) || 0;
  const [rentStartDate, setRentStartDate] = useState(today);
  const [monthlyRent, setMonthlyRent] = useState(roomRent);
  const [monthlyMaintenance, setMonthlyMaintenance] = useState(roomMaintenance);
  const [securityDeposit, setSecurityDeposit] = useState(roomDeposit);
  const [rentDueDay, setRentDueDay] = useState(Math.min(28, new Date().getDate()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const available = Math.max(0, Number(item.room?.availableOccupancy ?? item.room?.maxOccupancy ?? 1));

  async function submit(event) {
    event.preventDefault();
    setError("");
    const count = Number(occupancy || 0);
    if (!count || count < 1) return setError("Occupancy must be at least 1.");
    if (count > available) return setError(`Only ${available} occupancy left for this room.`);
    setSaving(true);
    try {
      if (!rentStartDate || Number(monthlyRent) <= 0) return setError("Rent start date and monthly rent are required.");
      await onConfirm({ occupancy: count, assignedUnit, assignedBed, note, rentStartDate, monthlyRent: Number(monthlyRent), monthlyMaintenance: Number(monthlyMaintenance || 0), securityDeposit: Number(securityDeposit || 0), rentDueDay: Number(rentDueDay) });
    } catch (err) {
      setError(err.message || "Unable to confirm booking.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="document-modal room-owner-scroll-modal" onMouseDown={onClose}>
      <form className="document-modal-card admin-edit-modal room-owner-modal-card" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="document-modal-head">
          <div>
            <strong>Confirm room booked</strong>
            <span>{roomId(item.room)} | {available} occupancy available</span>
          </div>
          <button className="document-close" type="button" onClick={onClose}><X size={18} /></button>
        </div>
        {error ? <div className="login-error">{error}</div> : null}
        <div className="admin-edit-grid">
          <label className="form-group">
            <span className="form-label">Occupancy taken</span>
            <input className="form-input" type="number" min="1" max={available} value={occupancy} onChange={(event) => setOccupancy(event.target.value)} required />
          </label>
          <label className="form-group">
            <span className="form-label">Assigned room / unit</span>
            <input className="form-input" value={assignedUnit} onChange={(event) => setAssignedUnit(event.target.value)} placeholder="Room 204 / PG Block A" />
          </label>
          <label className="form-group">
            <span className="form-label">Assigned bed</span>
            <input className="form-input" value={assignedBed} onChange={(event) => setAssignedBed(event.target.value)} placeholder="Bed 2 / Lower bunk" />
          </label>
          <label className="form-group">
            <span className="form-label">Rent start date</span>
            <input className="form-input" type="date" value={rentStartDate} onChange={(event) => { setRentStartDate(event.target.value); setRentDueDay(Math.min(28, Number(event.target.value.slice(-2)) || 1)); }} required />
          </label>
          <label className="form-group">
            <span className="form-label">Monthly room rent</span>
            <input className="form-input" type="number" min="1" value={monthlyRent} onChange={(event) => setMonthlyRent(event.target.value)} required />
          </label>
          <label className="form-group">
            <span className="form-label">Monthly maintenance</span>
            <input className="form-input" type="number" min="0" value={monthlyMaintenance} onChange={(event) => setMonthlyMaintenance(event.target.value)} />
          </label>
          <label className="form-group">
            <span className="form-label">Security deposit</span>
            <input className="form-input" type="number" min="0" value={securityDeposit} onChange={(event) => setSecurityDeposit(event.target.value)} />
          </label>
          <label className="form-group">
            <span className="form-label">Monthly due day (1-28)</span>
            <input className="form-input" type="number" min="1" max="28" value={rentDueDay} onChange={(event) => setRentDueDay(event.target.value)} required />
          </label>
          <label className="form-group admin-edit-wide">
            <span className="form-label">Booking note</span>
            <textarea className="form-input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Deposit received, documents verified, move-in date..." />
          </label>
        </div>
        <div className="admin-actions room-owner-modal-actions">
          <button className="btn-secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="btn-primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Approve booking"}</button>
        </div>
      </form>
    </div>
  );
}

function CandidateModal({ candidate, onClose }) {
  const docs = [candidate.profilePhoto, candidate.resume, ...(candidate.documents || [])].filter(Boolean);
  return (
    <div className="document-modal room-owner-scroll-modal" onMouseDown={onClose}>
      <section className="document-modal-card admin-edit-modal room-owner-modal-card" onMouseDown={(event) => event.stopPropagation()}>
        <div className="document-modal-head">
          <div>
            <strong>{candidate.fullName || "Candidate Profile"}</strong>
            <span>{candidate.immutableId || candidate.email}</span>
          </div>
          <button className="document-close" type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="admin-edit-grid">
          <Bio label="Name" value={candidate.fullName} />
          <Bio label="Candidate ID" value={candidate.immutableId || candidate._id} />
          <Bio label="Email" value={candidate.email} />
          <Bio label="Mobile" value={candidate.mobile || candidate.phone} />
          <Bio label="DOB" value={displayDate(candidate.dateOfBirth)} />
          <Bio label="Age" value={ageFromDob(candidate.dateOfBirth)} />
          <Bio label="Gender" value={candidate.gender} />
          <Bio label="Address" value={candidate.address} />
          <Bio label="Pincode" value={candidate.pincode} />
          <Bio label="Skills" value={(candidate.skills || []).join(", ")} />
          <Bio label="Experience" value={candidate.experience || `${candidate.workExperienceMonths || 0} months`} />
          <Bio label="Availability" value={candidate.availability} />
          <Bio label="About" value={candidate.about} wide />
        </div>
        <h3 className="form-title admin-section-title">Documents</h3>
        <div className="admin-doc-grid">
          {docs.length ? docs.map((doc, index) => <a key={doc.url || index} className="admin-doc" href={doc.url || doc} target="_blank" rel="noreferrer"><span className="admin-doc-icon">DOC</span><b>{doc.label || doc.type || `Document ${index + 1}`}</b><span>Open preview</span></a>) : <p className="section-desc">No documents uploaded.</p>}
        </div>
      </section>
    </div>
  );
}

function Bio({ label, value, wide = false }) {
  if (!value) return null;
  return (
    <div className={wide ? "form-group admin-edit-wide" : "form-group"}>
      <span className="form-label">{label}</span>
      <div className="detail-desc">{value}</div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="room-owner-info">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}
