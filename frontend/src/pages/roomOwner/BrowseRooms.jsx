import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BadgeCheck, CheckCircle2, Home, MapPin, Search, SlidersHorizontal, Wallet } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { useToast } from "../../contexts/ToastContext.jsx";
import { getSession } from "../../utils/auth.js";
import { fetchRooms, toggleRoomSaved } from "../candidate/candidateApi.js";
import { Button } from "../../components/ui/button.jsx";
import { Input } from "../../components/ui/input.jsx";
import { StatusPill } from "../../components/primitives/StatusPill.jsx";
import { cn } from "../../lib/utils.js";

const roomTypes = ["All Rooms", "Single", "Shared", "Furnished", "PG", "Family"];

function getId(room) {
  return room._id || room.id;
}

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
    const text = `${room.title || ""} ${room.owner || room.propertyName || ""} ${room.location || room.address || ""} ${(room.tags || room.amenities || []).join(" ")} ${room.roomType || ""}`.toLowerCase();
    const qmatch = q.trim() === "" || text.includes(q.toLowerCase());
    const tmatch = type === "All Rooms" || text.includes(type.toLowerCase());
    return qmatch && tmatch;
  }), [rooms, q, type]);

  async function handleSave(room) {
    const session = getSession();
    if (!session) {
      navigate("/login", { state: { from: `/rooms/${getId(room)}`, role: "candidate", error: `${t("auth.login", "Login")} required` } });
      return;
    }
    try {
      const result = await toggleRoomSaved(getId(room));
      setRooms((items) => items.map((item) => {
        if (String(getId(item)) !== String(getId(room))) return item;
        return { ...item, isSaved: !item.isSaved, savedCount: result.data?.savedCount ?? item.savedCount };
      }));
      toast.show(result.message, "success");
    } catch (err) {
      toast.show(err.message || "Unable to update saved room.", "error");
    }
  }

  return (
    <>
      <section className="mesh-bg border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <h1 className="font-display text-4xl font-bold">Book verified rooms</h1>
          <p className="mt-2 text-muted-foreground">
            {lang === "en" ? "Photos, amenities, map and visit booking after login." : "Rooms browse karo, visit booking ke liye login karo."}
          </p>
          <div className="mt-8 grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-2xl border border-border bg-card p-2 shadow-float">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-11 rounded-xl border-transparent bg-muted pl-9" placeholder="Location, PG name, amenities" value={q} onChange={(event) => setQ(event.target.value)} />
            </div>
            <Button variant="signal" size="lg"><SlidersHorizontal className="size-4" />Sort / Filter</Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {roomTypes.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setType(item)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
                  type === item ? "border-signal bg-signal/15 text-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {error ? <div className="mb-6 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-semibold text-destructive">{error}</div> : null}
        <p className="text-sm text-muted-foreground"><strong className="text-foreground">{filtered.length}</strong> rooms found</p>
        {loading ? (
          <div className="mt-6 rounded-2xl border border-border bg-card p-10 text-muted-foreground shadow-float">Loading rooms...</div>
        ) : filtered.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((room) => <RoomBrowseCard key={getId(room)} room={room} onSave={() => handleSave(room)} />)}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-border p-16 text-center">
            <h2 className="text-lg font-semibold">No rooms match this filter</h2>
            <p className="mt-2 text-sm text-muted-foreground">Try another area, amenity, or room type.</p>
            <Button className="mt-6" variant="outline" onClick={() => { setType("All Rooms"); setQ(""); }}>Clear filters</Button>
          </div>
        )}
      </section>
    </>
  );
}

function RoomBrowseCard({ room, onSave }) {
  const id = getId(room);
  const amenities = room.tags || room.amenities || [room.roomType].filter(Boolean);

  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-float transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to={`/rooms/${id}`} className="font-display text-lg font-semibold leading-tight hover:text-signal">{room.propertyName || room.title || "Verified room"}</Link>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            {room.owner || "Room Owner"}
            {room.ownerVerified || room.verificationStatus === "verified" ? <BadgeCheck className="size-4 text-verified" /> : null}
          </p>
        </div>
        <StatusPill status={room.status || "live"} />
      </div>
      <div className="mt-5 grid gap-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2"><MapPin className="size-4 text-signal" />{room.location || room.address || "Location not specified"}</span>
        <span className="inline-flex items-center gap-2"><Wallet className="size-4 text-signal" />{room.rent || "Rent not disclosed"}</span>
        <span className="inline-flex items-center gap-2"><Home className="size-4 text-signal" />{room.roomType || "Room"}</span>
        <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-verified" />Moderated listing</span>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {amenities.slice(0, 4).map((amenity) => <span key={amenity} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{amenity}</span>)}
      </div>
      <div className="mt-auto flex gap-2 pt-6">
        <Button className="flex-1" variant="outline" onClick={onSave}>{room.isSaved ? "Saved" : "Save"}</Button>
        <Link className="flex-1" to={`/rooms/${id}`}><Button className="w-full" variant="signal">Book Visit</Button></Link>
      </div>
    </article>
  );
}
