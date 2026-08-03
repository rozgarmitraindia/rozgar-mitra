import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { useToast } from "../../contexts/ToastContext.jsx";
import { getSession } from "../../utils/auth.js";
import { fetchRooms, toggleRoomSaved } from "../candidate/candidateApi.js";

export default function BrowseRooms() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("All Rooms");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { lang, t } = useLanguage();
  const toast = useToast();

  useEffect(() => {
    async function loadRooms() {
      setLoading(true);
      setError("");
      try {
        const items = await fetchRooms();
        setRooms(items);
      } catch (err) {
        setError(err.message || "Unable to load rooms.");
      } finally {
        setLoading(false);
      }
    }
    loadRooms();
  }, []);

  const filtered = useMemo(() => rooms.filter((room) => {
    const qmatch = q.trim() === "" || `${room.title} ${room.owner || room.propertyName} ${room.tags?.join(" ") || ""}`.toLowerCase().includes(q.toLowerCase());
    const tmatch = type === "All Rooms" || (room.tags || []).join(" ").toLowerCase().includes(type.toLowerCase());
    return qmatch && tmatch;
  }), [rooms, q, type]);

  async function handleSave(room) {
    const session = getSession();
    if (!session) {
      navigate("/login", { state: { from: `/rooms/${room._id || room.id}`, role: "candidate", error: t("auth.login") + " required" } });
      return;
    }
    try {
      const result = await toggleRoomSaved(room._id || room.id);
      setRooms((items) => items.map((item) => {
        if (String(item._id || item.id) !== String(room._id || room.id)) return item;
        return {
          ...item,
          isSaved: !item.isSaved,
          savedCount: result.data?.savedCount ?? item.savedCount,
        };
      }));
      toast.show(result.message, "success");
    } catch (err) {
      toast.show(err.message || "Unable to update saved room.", "error");
    }
  }

  return (
    <section className="section">
      <div className="section-header">
        <div className="section-label">{t('nav.rooms')}</div>
        <h1 className="section-title">{t('nav.rooms')} / {lang === 'en' ? 'PG' : 'PG'}</h1>
        <p className="section-desc">{t('rooms.sectionDesc') || (lang === "en" ? "Photos, amenities, map and visit booking." : "फ़ोटो, सुविधाएँ, नक्शा और विज़िट बुकिंग।")}</p>
      </div>
      <div className="search-box" style={{ margin: "0 auto 28px" }}>
        <input placeholder={t('rooms.searchPlaceholder') || "Location, PG name, amenities"} value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={type} onChange={(e) => setType(e.target.value)}><option>All Rooms</option><option>Single</option><option>Shared</option></select>
        <button className="btn-search" type="button">{t('rooms.searchBtn') || 'Search Rooms'}</button>
      </div>
      {error ? <div className="login-error">{error}</div> : null}
      {loading ? (
        <div className="section"><p className="section-desc">Loading rooms…</p></div>
      ) : (
        <div className="rooms-grid">
          {filtered.length ? filtered.map((room) => (
            <article className="room-card animated-card" key={room._id || room.id}>
              <Link to={`/rooms/${room._id || room.id}`} className="job-card-header">
                <div className="room-icon">{room.icon || "🏠"}</div>
                <div><h3 className="room-title">{room.propertyName || room.title}</h3><div className="room-location">{room.owner} • {room.location || room.address}</div></div>
              </Link>
              <div className="job-tags">{(room.tags || []).map((tag) => <span className="job-tag" key={tag}>{tag}</span>)}</div>
              <div className="job-footer">
                <span className="room-price">{room.rent || "—"}</span>
                <button className="btn-wa" type="button" onClick={() => handleSave(room)}>{room.isSaved ? "Saved" : `♡ ${t('common.save') || (lang === "en" ? "Save" : "सेव")}`}</button>
                <Link to={`/rooms/${room._id || room.id}`} className="btn-search">{t('rooms.bookVisit') || (lang === "en" ? "Book Visit" : "विज़िट बुक करें")}</Link>
              </div>
            </article>
          )) : (
            <div className="section"><p className="section-desc">No rooms matched your search.</p></div>
          )}
        </div>
      )}
    </section>
  );
}
