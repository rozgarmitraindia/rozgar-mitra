import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BadgeCheck, CalendarClock, Camera, CheckCircle2, Home, MapPin, Search, SlidersHorizontal, Users } from "lucide-react";
import { motion } from "motion/react";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { useToast } from "../../contexts/ToastContext.jsx";
import { getSession } from "../../utils/auth.js";
import { fetchRooms, requestRoomVisit, toggleRoomSaved } from "../candidate/candidateApi.js";
import { Button } from "../../components/ui/button.jsx";
import { Input } from "../../components/ui/input.jsx";
import { StatusPill } from "../../components/primitives/StatusPill.jsx";
import { cn } from "../../lib/utils.js";

const roomTypes = ["All", "Single Room", "1 BHK", "2 BHK", "PG Bed", "Shared Room"];
const cities = ["All", "Lucknow", "Kanpur", "Noida", "Delhi", "Gurugram", "Mumbai", "Pune", "Bengaluru", "Hyderabad"];
const furnishings = ["All", "Unfurnished", "Semi-furnished", "Fully furnished"];
const genders = ["All", "Any", "Male only", "Female only", "Family only"];
const bathrooms = ["All", "Attached", "Shared"];
const amenityOptions = ["Wi-Fi", "Attached bathroom", "24x7 water", "Power backup", "Parking", "Kitchen access", "AC", "Geyser", "CCTV", "Lift"];

function getId(room) {
  return room._id || room.id;
}

function formatINR(value) {
  const number = Number(value || 0);
  if (!number) return "Rent not disclosed";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(number);
}

function getPhotos(room) {
  return (room.photos || []).map((photo, index) => typeof photo === "string" ? { id: `photo-${index}`, url: photo, isCover: index === 0 } : photo).filter((photo) => photo?.url);
}

function displayDate(value) {
  if (!value) return "Available soon";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return String(value);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function setMeta(name, content, property = false) {
  let tag = document.head.querySelector(`meta[${property ? "property" : "name"}="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(property ? "property" : "name", name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

export default function BrowseRooms() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("All");
  const [rentMax, setRentMax] = useState(50000);
  const [city, setCity] = useState("All");
  const [furnishing, setFurnishing] = useState("All");
  const [gender, setGender] = useState("All");
  const [bathroom, setBathroom] = useState("All");
  const [availableFrom, setAvailableFrom] = useState("");
  const [amenities, setAmenities] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { t } = useLanguage();
  const toast = useToast();

  useEffect(() => {
    document.title = "Rooms in India | Rozgar Mitra";
    const description = "Verified rooms, PG beds, and rental homes with owner checks on Rozgar Mitra.";
    setMeta("description", description);
    setMeta("og:title", "Rooms in India | Rozgar Mitra", true);
    setMeta("og:description", description, true);
  }, []);

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
    const searchText = `${room.title || ""} ${room.locality || ""} ${room.city || ""} ${room.owner || room.ownerName || ""} ${room.address || ""}`.toLowerCase();
    const queryMatch = !q.trim() || searchText.includes(q.toLowerCase());
    const typeMatch = type === "All" || (room.type || room.roomType) === type;
    const rentMatch = !Number(room.rent) || Number(room.rent) <= rentMax;
    const cityMatch = city === "All" || room.city === city;
    const furnishingMatch = furnishing === "All" || room.furnishing === furnishing;
    const genderMatch = gender === "All" || room.gender === gender;
    const bathroomMatch = bathroom === "All" || room.bathroom === bathroom;
    const amenityMatch = amenities.every((item) => (room.amenities || []).includes(item));
    const availableMatch = !availableFrom || !room.availableFrom || new Date(room.availableFrom) <= new Date(availableFrom);
    return queryMatch && typeMatch && rentMatch && cityMatch && furnishingMatch && genderMatch && bathroomMatch && amenityMatch && availableMatch;
  }), [rooms, q, type, rentMax, city, furnishing, gender, bathroom, amenities, availableFrom]);

  function clearFilters() {
    setQ("");
    setType("All");
    setRentMax(50000);
    setCity("All");
    setFurnishing("All");
    setGender("All");
    setBathroom("All");
    setAvailableFrom("");
    setAmenities([]);
  }

  async function handleBook(room) {
    const session = getSession();
    if (!session) {
      navigate("/login", { state: { from: `/rooms/${getId(room)}`, role: "candidate", error: "Login to book a room visit." } });
      return;
    }
    try {
      await requestRoomVisit(getId(room), {});
      toast.show("Visit request submitted.", "success");
    } catch (err) {
      toast.show(err.message || "Unable to request visit.", "error");
    }
  }

  async function handleSave(room) {
    const session = getSession();
    if (!session) {
      navigate("/login", { state: { from: `/rooms/${getId(room)}`, role: "candidate", error: "Login to shortlist rooms." } });
      return;
    }
    try {
      const result = await toggleRoomSaved(getId(room));
      setRooms((items) => items.map((item) => String(getId(item)) === String(getId(room)) ? { ...item, isSaved: result.data?.isSaved ?? !item.isSaved, savedCount: result.data?.savedCount ?? item.savedCount } : item));
      toast.show(result.message || "Saved", "success");
    } catch (err) {
      toast.show(err.message || "Unable to save room.", "error");
    }
  }

  return (
    <>
      <section className="mesh-bg border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <h1 className="font-display text-4xl font-bold">{t("rooms.publicTitle", "Book verified rooms")}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{t("rooms.publicSub", "Search title, locality, city, or owner. Visit booking opens after login.")}</p>
          <div className="mt-8 grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-2xl border border-border bg-card p-2 shadow-float">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-11 rounded-xl border-transparent bg-muted pl-9" placeholder="Title, locality, city, owner" value={q} onChange={(event) => setQ(event.target.value)} />
            </div>
            <Button variant="signal" size="lg" onClick={() => setShowFilters((value) => !value)}><SlidersHorizontal className="size-4" />Sort / Filter</Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {roomTypes.map((item) => (
              <button key={item} type="button" onClick={() => setType(item)} className={cn("rounded-full border px-3.5 py-1.5 text-xs font-semibold transition", type === item ? "border-signal bg-signal/15 text-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground")}>{item}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className={cn("h-fit rounded-2xl border border-border bg-card p-4 shadow-float lg:sticky lg:top-24", showFilters ? "block" : "hidden lg:block")}>
          <Filters rentMax={rentMax} setRentMax={setRentMax} city={city} setCity={setCity} furnishing={furnishing} setFurnishing={setFurnishing} gender={gender} setGender={setGender} bathroom={bathroom} setBathroom={setBathroom} availableFrom={availableFrom} setAvailableFrom={setAvailableFrom} amenities={amenities} setAmenities={setAmenities} clearFilters={clearFilters} />
        </aside>

        <div>
          {error ? <div className="mb-6 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-semibold text-destructive">{error}</div> : null}
          <p className="text-sm text-muted-foreground"><strong className="text-foreground">{filtered.length}</strong> rooms</p>
          {loading ? (
            <div className="mt-6 rounded-2xl border border-border bg-card p-10 text-muted-foreground shadow-float">Loading rooms...</div>
          ) : filtered.length ? (
            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((room, index) => <RoomCard key={getId(room)} room={room} index={index} onBook={() => handleBook(room)} onSave={() => handleSave(room)} />)}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-border p-16 text-center">
              <h2 className="text-lg font-semibold">No rooms match this filter</h2>
              <p className="mt-2 text-sm text-muted-foreground">Try another area, amenity, or room type.</p>
              <Button className="mt-6" variant="outline" onClick={clearFilters}>Clear filters</Button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function Filters(props) {
  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Filters</h2>
        <button type="button" className="text-xs font-bold text-signal" onClick={props.clearFilters}>Clear</button>
      </div>
      <label className="grid gap-2 text-sm font-semibold">Rent up to {formatINR(props.rentMax)}
        <input type="range" min="3000" max="50000" step="1000" value={props.rentMax} onChange={(event) => props.setRentMax(Number(event.target.value))} />
      </label>
      <Select label="City" value={props.city} setValue={props.setCity} values={cities} />
      <Select label="Furnishing" value={props.furnishing} setValue={props.setFurnishing} values={furnishings} />
      <Select label="Gender" value={props.gender} setValue={props.setGender} values={genders} />
      <Select label="Bathroom" value={props.bathroom} setValue={props.setBathroom} values={bathrooms} />
      <label className="grid gap-2 text-sm font-semibold">Available by
        <Input type="date" value={props.availableFrom} onChange={(event) => props.setAvailableFrom(event.target.value)} />
      </label>
      <div>
        <h3 className="text-sm font-bold">Amenities</h3>
        <div className="mt-2 grid gap-2">
          {amenityOptions.map((item) => (
            <label key={item} className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={props.amenities.includes(item)} onChange={() => props.setAmenities((list) => list.includes(item) ? list.filter((value) => value !== item) : [...list, item])} />
              {item}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function Select({ label, value, setValue, values }) {
  return <label className="grid gap-2 text-sm font-semibold">{label}<select className="h-10 rounded-lg border border-border bg-card px-3 text-sm" value={value} onChange={(event) => setValue(event.target.value)}>{values.map((item) => <option key={item}>{item}</option>)}</select></label>;
}

function RoomCard({ room, index, onBook, onSave }) {
  const id = getId(room);
  const photos = getPhotos(room);
  const cover = photos.find((photo) => photo.isCover) || photos[0];
  const amenities = room.amenities || [];
  return (
    <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.24) }} className="overflow-hidden rounded-2xl border border-border bg-card shadow-float transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="relative aspect-[16/10] bg-gradient-to-br from-signal/20 to-verified/10">
        {cover?.url ? <img src={cover.url} alt={`${room.title} - photo 1`} loading="lazy" className="h-full w-full object-cover" /> : <div className="rule-grid absolute inset-0" />}
        <span className="absolute left-3 top-3"><StatusPill status={room.status || "live"} /></span>
        <span className="absolute right-3 top-3 rounded-full bg-card/90 px-2 py-1 text-xs font-bold text-foreground"><Camera className="mr-1 inline size-3" />{photos.length}</span>
        <span className="absolute bottom-3 right-3 rounded-full bg-gradient-signal px-3 py-1.5 text-xs font-bold text-signal-foreground">{formatINR(room.rent)} /month</span>
      </div>
      <div className="p-5">
        <Link to={`/rooms/${id}`} className="block truncate font-display text-lg font-semibold leading-tight hover:text-signal">{room.title || room.propertyName || "Verified room"}</Link>
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-4 text-signal" />{room.locality || "Locality"} · {room.city || "City"}</p>
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Users className="size-4 text-signal" />{room.type || room.roomType || "Room"} · {room.gender || "Any"}</p>
        <p className="mt-2 text-sm font-semibold text-verified">{Number(room.availableOccupancy ?? room.maxOccupancy ?? 1)} occupancy left</p>
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground"><CalendarClock className="size-4 text-signal" />Available from {displayDate(room.availableFrom)}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {amenities.slice(0, 3).map((amenity) => <span key={amenity} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{amenity}</span>)}
          {amenities.length > 3 ? <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">+{amenities.length - 3}</span> : null}
        </div>
        <div className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
          <span className="grid size-8 place-items-center rounded-full bg-gradient-signal text-xs font-bold text-signal-foreground">{(room.owner || "O")[0]}</span>
          <span className="truncate">{room.owner || room.ownerName || "Room Owner"}</span>
          {room.ownerVerified ? <BadgeCheck className="size-4 text-verified" /> : null}
        </div>
        <div className="mt-5 flex gap-2">
          <Button className="flex-1" variant="signal" onClick={onBook}>Book visit</Button>
          <Link className="flex-1" to={`/rooms/${id}`}><Button className="w-full" variant="outline">View details</Button></Link>
        </div>
        <button type="button" onClick={onSave} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-signal">
          <CheckCircle2 className="size-3.5" />{room.isSaved ? "Shortlisted" : "Shortlist"}
        </button>
      </div>
    </motion.article>
  );
}
