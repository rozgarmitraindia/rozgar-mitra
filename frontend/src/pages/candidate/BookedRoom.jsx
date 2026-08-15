import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCandidateBookedRooms } from "./candidateApi.js";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const date = (value) => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";

function RoomBookingCard({ booking }) {
  const room = booking.room || {};
  const owner = booking.owner || {};
  return (
    <article className="dashboard-card">
      <div className="section-header">
        <div><h3>{room.title || room.propertyName || "Booked Room"}</h3><p>{room.address || [room.locality, room.city].filter(Boolean).join(", ") || "-"}</p></div>
        <span className="status-badge">{booking.bookingStatus === "booked" ? "Active Booking" : "Released"}</span>
      </div>
      <div className="details-grid">
        <p><strong>Room ID:</strong> {room.publicId || room.roomId || "-"}</p>
        <p><strong>Rent start date:</strong> {date(booking.rentStartDate || booking.updatedAt)}</p>
        <p><strong>Monthly rent:</strong> {money(booking.monthlyRent || room.rent)}</p>
        <p><strong>Maintenance:</strong> {money(booking.monthlyMaintenance || room.maintenance)}</p>
        <p><strong>Security deposit:</strong> {money(booking.securityDeposit || room.deposit)}</p>
        <p><strong>Rent due date:</strong> Every month on day {booking.rentDueDay || "-"}</p>
        <p><strong>Assigned room/unit:</strong> {booking.assignedUnit || "-"}</p>
        <p><strong>Assigned bed:</strong> {booking.assignedBed || "-"}</p>
        <p><strong>Booked occupancy:</strong> {booking.bookedOccupancy || 1}</p>
        <p><strong>Owner:</strong> {owner.propertyName || owner.fullName || "-"}</p>
        <p><strong>Owner phone:</strong> {owner.whatsapp || owner.mobile || owner.phone || "-"}</p>
        <p><strong>Owner email:</strong> {owner.email || "-"}</p>
      </div>
      {booking.bookingNote && <p><strong>Owner note:</strong> {booking.bookingNote}</p>}
      {(booking.rentPayments || []).length > 0 && (
        <div><h4>Rent payments</h4>{booking.rentPayments.map((payment, index) => <p key={payment._id || index}>{date(payment.paidAt || payment.createdAt)} — {money(payment.amount)} ({payment.status || "paid"})</p>)}</div>
      )}
    </article>
  );
}

export default function CandidateBookedRoom() {
  const [data, setData] = useState({ items: [], activeBooking: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCandidateBookedRooms().then(setData).catch((err) => setError(err.message || "Unable to load booked room")).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="dashboard-card"><p>Loading booked room...</p></div>;
  const history = (data.items || []).filter((item) => item._id !== data.activeBooking?._id);
  return (
    <div className="dashboard-stack">
      <div className="dashboard-card"><h2>Booked Room</h2><p>A candidate can have only one active room booking at a time.</p></div>
      {error && <div className="dashboard-card"><p className="form-error">{error}</p></div>}
      {!error && !data.activeBooking && <div className="dashboard-card empty-state"><h3>No active booked room</h3><p>Your confirmed room and rent details will appear here.</p><Link className="primary-btn" to="/rooms">Browse Rooms</Link></div>}
      {data.activeBooking && <RoomBookingCard booking={data.activeBooking} />}
      {history.length > 0 && <><div className="dashboard-card"><h2>Previous Bookings</h2></div>{history.map((item) => <RoomBookingCard booking={item} key={item._id} />)}</>}
    </div>
  );
}
