import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSession } from "../../utils/auth.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { useToast } from "../../contexts/ToastContext.jsx";
import { fetchRoomDetail, requestRoomVisit, toggleRoomSaved } from "../candidate/candidateApi.js";

export default function RoomDetails() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const toast = useToast();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRoom() {
      setLoading(true);
      setError("");
      try {
        const item = await fetchRoomDetail(roomId);
        setRoom(item);
      } catch (err) {
        setError(err.message || "Unable to load room details.");
      } finally {
        setLoading(false);
      }
    }
    loadRoom();
  }, [roomId]);

  if (loading) {
    return <section className="section"><div className="section-header"><h1 className="section-title">Loading room details…</h1></div></section>;
  }

  if (error) {
    return <section className="simple-page"><div className="info-card"><h1 className="section-title">{error}</h1></div></section>;
  }

  if (!room) {
    return <section className="simple-page"><div className="info-card"><h1 className="section-title">Room not found</h1></div></section>;
  }

  async function handleSave() {
    const session = getSession();
    if (!session || session.role !== "candidate") {
      navigate("/login", { state: { from: `/rooms/${roomId}`, role: "candidate", error: "Save karne ke liye candidate login compulsory hai." } });
      return;
    }
    setSaving(true);
    try {
      const result = await toggleRoomSaved(roomId);
      setRoom((current) => ({
        ...current,
        isSaved: !current.isSaved,
        savedCount: result.data?.savedCount ?? current.savedCount,
      }));
      toast.show(result.message, "success");
    } catch (err) {
      toast.show(err.message || "Unable to update saved room.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleVisitRequest() {
    const session = getSession();
    if (!session || session.role !== "candidate") {
      navigate("/login", { state: { from: `/rooms/${roomId}`, role: "candidate", error: "Booking karne ke liye candidate login compulsory hai." } });
      return;
    }
    setRequesting(true);
    try {
      await requestRoomVisit(roomId, {});
      toast.show("Visit request submitted.", "success");
    } catch (err) {
      toast.show(err.message || "Unable to send visit request.", "error");
    } finally {
      setRequesting(false);
    }
  }

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <div className="section-label">Room Details</div>
          <h1 className="section-title">{room.propertyName || room.title}</h1>
          <p className="section-desc">{room.owner || "Owner"} • {room.location || room.address}</p>
        </div>
      </div>

      <div className="detail-grid">
        <article className="form-card animated-card">
          <div className="detail-meta">
            <span>Rent: {room.rent || "N/A"}</span>
            <span>Deposit: {room.deposit || "N/A"}</span>
            <span>Amenities: {(room.tags || []).join(", ") || "Not listed"}</span>
            <span>{room.savedCount ? `${room.savedCount} saved` : "Not saved yet"}</span>
            <span>{room.bedrooms ? `${room.bedrooms} beds` : "Bedrooms not specified"}</span>
          </div>
          <div className="detail-list">
            <p><b>Address:</b> {room.location || room.address || "Not specified"}</p>
            <p><b>Owner:</b> {room.owner || "Not available"}</p>
            <p><b>Phone:</b> {room.contactNumber || "Not available"}</p>
            <p><b>Visit Area:</b> {room.area || "Not provided"}</p>
            <p><b>Map:</b> {room.map ? <a href={room.map} target="_blank" rel="noreferrer">Open Map</a> : "Not provided"}</p>
          </div>
          <div className="detail-desc">
            <h2 className="section-title">Overview</h2>
            <p>{room.description || "No full description available."}</p>
          </div>
        </article>

        <aside className="form-card animated-card">
          <h2 className="form-title">Book a Visit</h2>
          <p className="form-subtitle">Login ke baad booking request bheji jayegi. / Login to send booking request.</p>
          <div className="job-actions">
            <button className="btn-secondary" type="button" onClick={handleSave} disabled={saving}>
              {room.isSaved ? "Remove Save" : "Save Room"}
            </button>
            <button className="btn-primary" type="button" onClick={handleVisitRequest} disabled={requesting}>
              {requesting ? "Sending…" : (lang === "en" ? "Book Visit" : "विज़िट बुक करें")}
            </button>
          </div>
          <div className="detail-info">
            <p><strong>Status:</strong> {room.status || "Live"}</p>
            <p><strong>Posted:</strong> {room.createdAt ? new Date(room.createdAt).toLocaleDateString() : "Unknown"}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
