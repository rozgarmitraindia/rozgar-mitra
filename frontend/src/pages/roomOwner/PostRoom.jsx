import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Camera,
  CheckCircle2,
  GripVertical,
  Home,
  IndianRupee,
  MapPin,
  Save,
  ShieldAlert,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { apiFetch, apiUpload, getSession } from "../../utils/auth.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { useToast } from "../../contexts/ToastContext.jsx";
import { Button } from "../../components/ui/button.jsx";
import { Input } from "../../components/ui/input.jsx";
import { StatusPill } from "../../components/primitives/StatusPill.jsx";
import { cn } from "../../lib/utils.js";

const CITIES = ["Lucknow", "Kanpur", "Noida", "Ghaziabad", "Delhi", "Gurugram", "Mumbai", "Pune", "Bengaluru", "Hyderabad", "Jaipur"];
const CUSTOM_CITIES_KEY = "rm_room_custom_cities";
const ROOM_TYPES = ["Single Room", "1 BHK", "2 BHK", "PG Bed", "Shared Room"];
const FURNISHING = ["Unfurnished", "Semi-furnished", "Fully furnished"];
const GENDERS = ["Any", "Male only", "Female only", "Family only"];
const BATHROOMS = ["Attached", "Shared"];
const MIN_STAY = [1, 3, 6, 11, 12];
const AMENITIES = ["Wi-Fi", "Attached bathroom", "24x7 water", "Power backup", "Parking", "Kitchen access", "Fridge", "Washing machine", "AC", "Cooler", "Geyser", "Bed & mattress", "Almirah", "Study table", "Balcony", "CCTV", "Lift", "Security guard", "Housekeeping", "RO water"];
const RULES = ["No smoking inside", "No alcohol", "Vegetarian only", "Non-veg allowed", "No loud music after 10 PM", "Guests allowed till 9 PM", "No overnight guests", "Gate closes at 11 PM", "No pets", "Pets allowed", "Rent due by 5th of month", "Electricity billed separately", "Minimum 6 months stay", "1 month notice before leaving", "Keep common area clean", "ID proof mandatory"];

const initialRoom = {
  title: "",
  description: "",
  city: "Lucknow",
  locality: "",
  address: "",
  mapLink: "",
  landmark: "",
  rent: "",
  deposit: "",
  maintenance: "",
  electricityIncluded: false,
  type: "Single Room",
  furnishing: "Semi-furnished",
  gender: "Any",
  floor: "",
  totalFloors: "",
  areaSqft: "",
  bathroom: "Attached",
  totalRooms: 1,
  bedsPerRoom: 1,
  maxOccupancy: 1,
  availableFrom: "",
  minStayMonths: 6,
  noticePeriodDays: 30,
  preferredContactTime: "10am - 7pm",
  photos: [],
  amenities: [],
  rules: [],
  nearby: [{ label: "", distance: "" }],
  status: "draft",
  tone: "from-signal/20 to-verified/10",
};

function formatINR(value) {
  const number = Number(value || 0);
  if (!number) return "₹0";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(number);
}

function toDisplayDate(value) {
  if (!value) return "Select date";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function countText(value, min, max) {
  const length = String(value || "").trim().length;
  return `${length}/${max}${length && length < min ? `, min ${min}` : ""}`;
}

function readCustomCities() {
  try {
    const stored = JSON.parse(localStorage.getItem(CUSTOM_CITIES_KEY) || "[]");
    return Array.isArray(stored) ? stored.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function persistCustomCity(city) {
  const clean = String(city || "").trim();
  if (!clean || CITIES.some((item) => item.toLowerCase() === clean.toLowerCase())) return;
  const cities = readCustomCities();
  if (cities.some((item) => item.toLowerCase() === clean.toLowerCase())) return;
  localStorage.setItem(CUSTOM_CITIES_KEY, JSON.stringify([...cities, clean].sort((a, b) => a.localeCompare(b))));
}

function safeOwnerName(session) {
  return session?.user?.fullName || session?.user?.propertyName || session?.name || "Room Owner";
}

function presetForRoomType(type, current = {}) {
  if (type === "PG Bed") return { totalRooms: Number(current.totalRooms || 4), bedsPerRoom: Number(current.bedsPerRoom || 2), bathroom: current.bathroom || "Shared" };
  if (type === "Shared Room") return { totalRooms: Number(current.totalRooms || 1), bedsPerRoom: Number(current.bedsPerRoom || 2), bathroom: current.bathroom || "Shared" };
  if (type === "2 BHK") return { totalRooms: 1, bedsPerRoom: 4, bathroom: current.bathroom || "Attached" };
  if (type === "1 BHK") return { totalRooms: 1, bedsPerRoom: 2, bathroom: current.bathroom || "Attached" };
  return { totalRooms: 1, bedsPerRoom: 1, bathroom: current.bathroom || "Attached" };
}

function capacityFrom(room) {
  const totalRooms = Math.max(1, Number(room.totalRooms || 1));
  const bedsPerRoom = Math.max(1, Number(room.bedsPerRoom || 1));
  return totalRooms * bedsPerRoom;
}

function makePreviewRoom(room, session) {
  return {
    ...room,
    _id: "preview",
    publicId: "RM-ROOM-DRAFT",
    owner: safeOwnerName(session),
    ownerVerified: session?.user?.status === "verified",
    ownerPublicId: session?.user?.immutableId || session?.immutableId || "rozgarmitra-own",
    photos: room.photos,
    status: room.status || "draft",
  };
}

function missingFields(room) {
  const missing = [];
  if (room.title.trim().length < 10) missing.push("Title min 10 chars");
  if (room.description.trim().length < 40) missing.push("Description min 40 chars");
  if (!room.city) missing.push("City");
  if (!room.locality.trim()) missing.push("Locality");
  if (!room.address.trim()) missing.push("Full address");
  if (!Number(room.rent)) missing.push("Monthly rent");
  if (!room.availableFrom) missing.push("Available from");
  if (room.photos.length < 3) missing.push("Minimum 3 photos");
  if (!room.amenities.length) missing.push("At least 1 amenity");
  if (!room.rules.length) missing.push("At least 1 rule");
  return missing;
}

export default function PostRoom() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const { t } = useLanguage();
  const session = getSession();
  const editingId = searchParams.get("roomId");
  const fileRef = useRef(null);
  const [step, setStep] = useState(0);
  const [room, setRoom] = useState(initialRoom);
  const [customCities, setCustomCities] = useState(() => readCustomCities());
  const [cityMode, setCityMode] = useState("select");
  const [customAmenity, setCustomAmenity] = useState("");
  const [customRule, setCustomRule] = useState("");
  const [uploadQueue, setUploadQueue] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(Boolean(editingId));
  const [success, setSuccess] = useState(null);
  const previewRoom = useMemo(() => makePreviewRoom(room, session), [room, session]);
  const missing = useMemo(() => missingFields(room), [room]);
  const steps = [t("rooms.stepBasics", "Basics"), t("rooms.stepLocation", "Location"), t("rooms.stepRent", "Rent"), t("rooms.stepPhotos", "Photos"), t("rooms.stepRules", "Amenities")];

  useEffect(() => {
    if (!editingId) return undefined;
    let cancelled = false;
    async function loadRoom() {
      setLoadingEdit(true);
      try {
        const result = await apiFetch(`/employer/rooms/${editingId}`);
        const item = result.data || result.room || {};
        if (cancelled) return;
        setRoom({
          ...initialRoom,
          ...item,
          type: item.type || item.roomType || initialRoom.type,
          mapLink: item.mapLink || item.googleMapLink || "",
          photos: (item.photos || []).map((photo, index) => typeof photo === "string" ? { id: `photo-${index}`, url: photo, caption: "", isCover: index === 0 } : photo),
          nearby: item.nearby?.length ? item.nearby : [{ label: "", distance: "" }],
          amenities: item.amenities || [],
          rules: item.rules || [],
        });
        if (item.city && !CITIES.some((city) => city.toLowerCase() === String(item.city).toLowerCase())) {
          persistCustomCity(item.city);
          setCustomCities(readCustomCities());
          setCityMode("other");
        }
      } catch (error) {
        toast.show(error.message || "Unable to load room for edit", "error");
      } finally {
        if (!cancelled) setLoadingEdit(false);
      }
    }
    loadRoom();
    return () => {
      cancelled = true;
    };
  }, [editingId, toast]);

  function update(key, value) {
    setRoom((current) => {
      if (key === "type") {
        const preset = presetForRoomType(value, current);
        const next = { ...current, type: value, ...preset };
        return { ...next, maxOccupancy: capacityFrom(next) };
      }
      if (key === "totalRooms" || key === "bedsPerRoom") {
        const next = { ...current, [key]: value };
        return { ...next, maxOccupancy: capacityFrom(next) };
      }
      return { ...current, [key]: value };
    });
  }

  function saveCustomCity(city = room.city) {
    persistCustomCity(city);
    setCustomCities(readCustomCities());
  }

  function toggleList(key, value) {
    setRoom((current) => {
      const list = current[key] || [];
      const exists = list.includes(value);
      const next = exists ? list.filter((item) => item !== value) : [...list, value];
      return { ...current, [key]: key === "rules" ? next.slice(0, 12) : next };
    });
  }

  function updateNearby(index, key, value) {
    setRoom((current) => {
      const nearby = [...current.nearby];
      nearby[index] = { ...nearby[index], [key]: value };
      return { ...current, nearby };
    });
  }

  function addNearby() {
    setRoom((current) => current.nearby.length >= 6 ? current : { ...current, nearby: [...current.nearby, { label: "", distance: "" }] });
  }

  function removeNearby(index) {
    setRoom((current) => ({ ...current, nearby: current.nearby.filter((_, itemIndex) => itemIndex !== index) }));
  }

  async function handleFiles(files) {
    const nextFiles = Array.from(files || []);
    if (!nextFiles.length) return;
    const roomLeft = 12 - room.photos.length;
    const valid = [];
    const queue = [];
    for (const file of nextFiles.slice(0, roomLeft)) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        toast.show(`${file.name}: JPG, PNG, WEBP only`, "error");
        continue;
      }
      if (file.size > 8 * 1024 * 1024) {
        toast.show(`${file.name}: max 8 MB`, "error");
        continue;
      }
      valid.push(file);
      queue.push({ id: `${file.name}-${Date.now()}`, file, progress: 15 });
    }
    if (!valid.length) return;
    setUploadQueue((items) => [...items, ...queue]);
    let tick = null;
    try {
      const form = new FormData();
      valid.forEach((file) => form.append("files", file));
      tick = window.setInterval(() => {
        setUploadQueue((items) => items.map((item) => queue.some((entry) => entry.id === item.id) ? { ...item, progress: Math.min(item.progress + 18, 92) } : item));
      }, 260);
      const result = await apiUpload("/upload/room-photos", form);
      window.clearInterval(tick);
      const uploaded = (result.data?.documents || result.documents || []).map((doc, index) => ({
        id: doc.publicId || `${doc.url}-${Date.now()}`,
        url: doc.url,
        caption: valid[index]?.name?.replace(/\.[^.]+$/, "") || "",
        isCover: room.photos.length === 0 && index === 0,
      }));
      setRoom((current) => ({ ...current, photos: [...current.photos, ...uploaded].slice(0, 12).map((photo, index) => ({ ...photo, isCover: photo.isCover || index === 0 })) }));
      setUploadQueue((items) => items.filter((item) => !queue.some((entry) => entry.id === item.id)));
    } catch (error) {
      if (tick) window.clearInterval(tick);
      setUploadQueue((items) => items.filter((item) => !queue.some((entry) => entry.id === item.id)));
      toast.show(error.message || "Photo upload failed", "error");
    }
  }

  function setCover(index) {
    setRoom((current) => ({ ...current, photos: current.photos.map((photo, itemIndex) => ({ ...photo, isCover: itemIndex === index })) }));
  }

  function updateCaption(index, caption) {
    setRoom((current) => ({ ...current, photos: current.photos.map((photo, itemIndex) => itemIndex === index ? { ...photo, caption } : photo) }));
  }

  function deletePhoto(index) {
    setRoom((current) => {
      const photos = current.photos.filter((_, itemIndex) => itemIndex !== index);
      return { ...current, photos: photos.map((photo, itemIndex) => ({ ...photo, isCover: itemIndex === 0 || photo.isCover })) };
    });
  }

  function movePhoto(index, direction) {
    setRoom((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.photos.length) return current;
      const photos = [...current.photos];
      [photos[index], photos[target]] = [photos[target], photos[index]];
      return { ...current, photos };
    });
  }

  async function saveRoom(status = "draft") {
    if (!session || session.role !== "roomOwner") {
      navigate("/login", { state: { role: "roomOwner", error: "Room Owner login required" } });
      return;
    }
    if (status === "pending" && missing.length) {
      toast.show(`Missing: ${missing.slice(0, 3).join(", ")}`, "error");
      return;
    }
    setSaving(true);
    try {
      saveCustomCity(room.city);
      const payload = {
        ...room,
        status,
        rent: Number(room.rent || 0),
        deposit: Number(room.deposit || 0),
        maintenance: Number(room.maintenance || 0),
        floor: Number(room.floor || 0),
        totalFloors: Number(room.totalFloors || 0),
        areaSqft: Number(room.areaSqft || 0),
        totalRooms: Number(room.totalRooms || 1),
        bedsPerRoom: Number(room.bedsPerRoom || 1),
        maxOccupancy: Number(room.maxOccupancy || 1),
        noticePeriodDays: Number(room.noticePeriodDays || 0),
        minStayMonths: Number(room.minStayMonths || 1),
        nearby: room.nearby.filter((item) => item.label || item.distance),
      };
      const path = editingId ? `/employer/rooms/${editingId}` : "/employer/rooms";
      const method = editingId ? "PATCH" : "POST";
      const result = await apiFetch(path, { method, body: JSON.stringify({ ...payload, resubmit: status === "pending" }) });
      const saved = result.data?.room || result.room;
      if (status === "draft") {
        toast.show("Draft saved", "success");
        navigate("/room-owner/rooms");
      } else {
        setSuccess(saved);
      }
    } catch (error) {
      toast.show(error.message || "Unable to save room", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loadingEdit) {
    return <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6"><div className="rounded-3xl border border-border bg-card p-8 text-muted-foreground shadow-float">Loading room editor...</div></section>;
  }

  if (success) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-lift">
          <CheckCircle2 className="mx-auto size-12 text-verified" />
          <h1 className="mt-4 font-display text-3xl font-bold">{t("rooms.reviewSuccess", "Aapki listing review mein hai")}</h1>
          <p className="mt-3 text-muted-foreground">{t("rooms.reviewSub", "24 ghante mein update milega. Admin approval ke baad room public page par live hoga.")}</p>
          <div className="mx-auto mt-6 inline-flex rounded-full border border-border bg-muted px-4 py-2 text-sm font-bold">{success.publicId || success.roomId}</div>
          <div className="mt-8 grid gap-3 min-[520px]:flex min-[520px]:justify-center">
            <Link className="min-w-0" to="/room-owner/rooms"><Button className="w-full min-[520px]:w-auto" variant="signal">Manage listings</Button></Link>
            <Link className="min-w-0" to="/rooms"><Button className="w-full min-[520px]:w-auto" variant="outline">Browse public rooms</Button></Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mesh-bg min-h-screen border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Link to="/room-owner/rooms" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />{t("common.back", "Back")}</Link>
        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="section-label">{t("rooms.ownerWizard", "Room owner listing wizard")}</div>
            <h1 className="font-display text-4xl font-bold">{editingId ? "Edit Room" : t("rooms.postTitle", "Post a Room")}</h1>
            <p className="mt-2 text-muted-foreground">{t("rooms.postSub", "Premium room listing banao, photos upload karo, aur admin approval ke liye submit karo.")}</p>
          </div>
          <Button className="w-full lg:w-auto" variant="outline" onClick={() => saveRoom("draft")} disabled={saving}><Save className="size-4" />Save draft</Button>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-4 shadow-float">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gradient-signal transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-5">
            {steps.map((item, index) => (
              <button key={item} type="button" onClick={() => setStep(index)} className={cn("rounded-xl border px-3 py-2 text-xs font-bold transition", index === step ? "border-signal bg-signal/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground")}>
                {index + 1}. {item}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <motion.form className="rounded-3xl border border-border bg-card p-5 shadow-lift sm:p-7" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} onSubmit={(event) => event.preventDefault()}>
            {step === 0 ? <Basics room={room} update={update} /> : null}
            {step === 1 ? <LocationStep room={room} update={update} updateNearby={updateNearby} addNearby={addNearby} removeNearby={removeNearby} customCities={customCities} cityMode={cityMode} setCityMode={setCityMode} saveCustomCity={saveCustomCity} /> : null}
            {step === 2 ? <RentStep room={room} update={update} /> : null}
            {step === 3 ? <PhotosStep room={room} uploadQueue={uploadQueue} fileRef={fileRef} handleFiles={handleFiles} setCover={setCover} updateCaption={updateCaption} deletePhoto={deletePhoto} movePhoto={movePhoto} /> : null}
            {step === 4 ? <AmenitiesStep room={room} toggleList={toggleList} customAmenity={customAmenity} setCustomAmenity={setCustomAmenity} customRule={customRule} setCustomRule={setCustomRule} /> : null}

            <div className="mt-8 grid gap-3 border-t border-border pt-5 min-[620px]:flex min-[620px]:flex-wrap min-[620px]:justify-between">
              <Button className="w-full min-[620px]:w-auto" type="button" variant="outline" onClick={() => setStep((value) => Math.max(value - 1, 0))} disabled={step === 0}><ArrowLeft className="size-4" />Previous</Button>
              <div className="grid gap-3 min-[420px]:grid-cols-2 min-[620px]:flex min-[620px]:flex-wrap">
                <Button className="w-full min-[620px]:w-auto" type="button" variant="outline" onClick={() => saveRoom("draft")} disabled={saving}><Save className="size-4" />Save draft</Button>
                {step < steps.length - 1 ? (
                  <Button className="w-full min-[620px]:w-auto" type="button" variant="signal" onClick={() => setStep((value) => Math.min(value + 1, steps.length - 1))}>Next <ArrowRight className="size-4" /></Button>
                ) : (
                  <Button className="h-auto min-h-10 w-full whitespace-normal px-4 py-2.5 leading-snug min-[620px]:w-auto" type="button" variant="signal" onClick={() => saveRoom("pending")} disabled={saving}>{saving ? "Submitting..." : "Submit for admin approval"}</Button>
                )}
              </div>
            </div>
          </motion.form>

          <aside className="h-fit lg:sticky lg:top-24">
            <div className="rounded-3xl border border-border bg-card p-4 shadow-lift">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">Live preview</h2>
                <StatusPill status={room.status || "draft"} />
              </div>
              <RoomPreviewCard room={previewRoom} />
            </div>
            <div className="mt-4 rounded-3xl border border-border bg-card p-5 shadow-float">
              <h3 className="font-display text-base font-bold">Review</h3>
              <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                <span>{room.city || "City"} · {room.locality || "Locality"}</span>
                <span>{formatINR(room.rent)} /month · Deposit {formatINR(room.deposit)}</span>
                <span>{room.photos.length}/12 photos · {room.amenities.length} amenities · {room.rules.length} rules</span>
              </div>
              {missing.length ? (
                <div className="mt-4 rounded-2xl border border-pending/40 bg-pending/10 p-4 text-sm">
                  <strong className="text-foreground">Missing fields</strong>
                  <ul className="mt-2 grid gap-1 text-muted-foreground">
                    {missing.map((item) => <li key={item}>- {item}</li>)}
                  </ul>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl bg-verified/10 p-4 text-sm font-semibold text-foreground">Ready for admin approval.</div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children, hint }) {
  return <label className="grid gap-2 text-sm font-semibold text-foreground"><span>{label}</span>{children}{hint ? <span className="text-xs font-medium text-muted-foreground">{hint}</span> : null}</label>;
}

function ChipGroup({ values, selected, onSelect }) {
  return <div className="flex flex-wrap gap-2">{values.map((value) => <button key={value} type="button" onClick={() => onSelect(value)} className={cn("rounded-full border px-3.5 py-2 text-xs font-bold transition", selected === value ? "border-signal bg-signal/15 text-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground")}>{value}</button>)}</div>;
}

function Basics({ room, update }) {
  return (
    <div className="grid gap-5">
      <Field label="Title" hint={countText(room.title, 10, 70)}>
        <Input value={room.title} minLength={10} maxLength={70} onChange={(event) => update("title", event.target.value)} placeholder="Airy single room near Hazratganj" />
      </Field>
      <Field label="Room type"><ChipGroup values={ROOM_TYPES} selected={room.type} onSelect={(value) => update("type", value)} /></Field>
      <div className="rounded-2xl border border-border bg-muted p-4 text-sm text-muted-foreground">
        {room.type === "PG Bed" || room.type === "Shared Room"
          ? "PG/hostel setup: total rooms aur beds per room se total occupancy auto-calculate hogi."
          : "Independent room setup: occupancy room type ke according preset ho gayi hai, zarurat ho to edit kar sakte hain."}
      </div>
      <Field label="Furnishing"><ChipGroup values={FURNISHING} selected={room.furnishing} onSelect={(value) => update("furnishing", value)} /></Field>
      <Field label="Gender preference"><ChipGroup values={GENDERS} selected={room.gender} onSelect={(value) => update("gender", value)} /></Field>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Bathroom"><ChipGroup values={BATHROOMS} selected={room.bathroom} onSelect={(value) => update("bathroom", value)} /></Field>
        <Field label="Floor"><Input type="number" min="0" value={room.floor} onChange={(event) => update("floor", event.target.value)} /></Field>
        <Field label="Total floors"><Input type="number" min="0" value={room.totalFloors} onChange={(event) => update("totalFloors", event.target.value)} /></Field>
        <Field label="Total rooms"><Input type="number" min="1" value={room.totalRooms} onChange={(event) => update("totalRooms", event.target.value)} /></Field>
        <Field label="Beds per room"><Input type="number" min="1" value={room.bedsPerRoom} onChange={(event) => update("bedsPerRoom", event.target.value)} /></Field>
        <Field label="Max occupancy"><Input type="number" min="1" value={room.maxOccupancy} onChange={(event) => update("maxOccupancy", event.target.value)} /></Field>
      </div>
      <Field label="Area sqft"><Input type="number" min="1" value={room.areaSqft} onChange={(event) => update("areaSqft", event.target.value)} placeholder="220" /></Field>
      <Field label="Description" hint={countText(room.description, 40, 800)}>
        <textarea className="min-h-36 rounded-xl border border-border bg-card p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-signal" minLength={40} maxLength={800} value={room.description} onChange={(event) => update("description", event.target.value)} placeholder="Room ki details, ventilation, safety, locality aur ideal tenant ke baare me likhein." />
      </Field>
    </div>
  );
}

function LocationStep({ room, update, updateNearby, addNearby, removeNearby, customCities, cityMode, setCityMode, saveCustomCity }) {
  const [citySearch, setCitySearch] = useState(room.city || "");
  const [cityOpen, setCityOpen] = useState(false);
  const cityOptions = [...CITIES, ...customCities.filter((city) => !CITIES.some((item) => item.toLowerCase() === city.toLowerCase()))];
  const filteredCities = cityOptions.filter((city) => city.toLowerCase().includes(citySearch.toLowerCase())).slice(0, 8);

  function selectCity(value) {
    if (value === "Other") {
      setCityMode("other");
      setCitySearch("");
      update("city", "");
      setCityOpen(true);
      return;
    }
    setCityMode("select");
    setCitySearch(value);
    update("city", value);
    setCityOpen(false);
  }

  function handleCityInput(value) {
    setCitySearch(value);
    update("city", value);
    setCityOpen(true);
    if (!cityOptions.some((city) => city.toLowerCase() === value.toLowerCase())) setCityMode("other");
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City">
          <div className="relative grid gap-2">
            <Input
              value={citySearch}
              onChange={(event) => handleCityInput(event.target.value)}
              onFocus={() => setCityOpen(true)}
              onBlur={() => window.setTimeout(() => {
                setCityOpen(false);
                saveCustomCity(room.city);
              }, 120)}
              placeholder="Search or type city"
            />
            {cityOpen ? (
              <div className="absolute left-0 right-0 top-12 z-20 max-h-64 overflow-auto rounded-2xl border border-border bg-card p-2 shadow-lift">
                {filteredCities.map((city) => (
                  <button key={city} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectCity(city)} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                    {city}
                  </button>
                ))}
                <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectCity("Other")} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-signal hover:bg-accent">
                  Other / Add new city
                </button>
                {citySearch && !filteredCities.some((city) => city.toLowerCase() === citySearch.toLowerCase()) ? (
                  <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { saveCustomCity(citySearch); selectCity(citySearch); }} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-verified hover:bg-accent">
                    Add "{citySearch}"
                  </button>
                ) : null}
              </div>
            ) : null}
            {cityMode === "other" ? <span className="text-xs font-medium text-muted-foreground">Manual city save ho jayegi aur next time dropdown me dikhegi.</span> : null}
          </div>
        </Field>
        <Field label="Locality / Area"><Input value={room.locality} onChange={(event) => update("locality", event.target.value)} placeholder="Hazratganj" /></Field>
      </div>
      <Field label="Full address"><textarea className="min-h-24 rounded-xl border border-border bg-card p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-signal" value={room.address} onChange={(event) => update("address", event.target.value)} placeholder="House no, street, area, city" /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Landmark"><Input value={room.landmark} onChange={(event) => update("landmark", event.target.value)} placeholder="Near Sahara Ganj" /></Field>
        <Field label="Google Maps link" hint={room.mapLink && !/^https?:\/\//i.test(room.mapLink) ? "Valid http/https link required" : ""}><Input type="url" value={room.mapLink} onChange={(event) => update("mapLink", event.target.value)} placeholder="https://maps.google.com/..." /></Field>
      </div>
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-base font-bold">Nearby</h3>
          <Button type="button" variant="outline" size="sm" onClick={addNearby}>Add row</Button>
        </div>
        <div className="grid gap-3">
          {room.nearby.map((item, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px_auto]">
              <Input value={item.label} onChange={(event) => updateNearby(index, "label", event.target.value)} placeholder="Metro station" />
              <Input value={item.distance} onChange={(event) => updateNearby(index, "distance", event.target.value)} placeholder="600 m" />
              <Button type="button" variant="ghost" size="icon" onClick={() => removeNearby(index)}><X className="size-4" /></Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RentStep({ room, update }) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Monthly rent ₹" hint={formatINR(room.rent)}><Input type="number" min="0" value={room.rent} onChange={(event) => update("rent", event.target.value)} /></Field>
        <Field label="Security deposit ₹" hint={formatINR(room.deposit)}><Input type="number" min="0" value={room.deposit} onChange={(event) => update("deposit", event.target.value)} /></Field>
        <Field label="Maintenance ₹/month" hint={formatINR(room.maintenance)}><Input type="number" min="0" value={room.maintenance} onChange={(event) => update("maintenance", event.target.value)} /></Field>
      </div>
      <label className="inline-flex items-center gap-3 rounded-2xl border border-border bg-muted p-4 text-sm font-bold">
        <input type="checkbox" checked={room.electricityIncluded} onChange={(event) => update("electricityIncluded", event.target.checked)} />
        Electricity included
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Available from"><Input type="date" value={room.availableFrom} onChange={(event) => update("availableFrom", event.target.value)} /></Field>
        <Field label="Minimum stay"><select className="h-10 rounded-lg border border-border bg-card px-3 text-sm" value={room.minStayMonths} onChange={(event) => update("minStayMonths", event.target.value)}>{MIN_STAY.map((month) => <option key={month} value={month}>{month} months</option>)}</select></Field>
        <Field label="Notice period days"><Input type="number" min="0" value={room.noticePeriodDays} onChange={(event) => update("noticePeriodDays", event.target.value)} /></Field>
      </div>
    </div>
  );
}

function PhotosStep({ room, uploadQueue, fileRef, handleFiles, setCover, updateCaption, deletePhoto, movePhoto }) {
  return (
    <div className="grid gap-5">
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(event) => handleFiles(event.target.files)} />
      <button type="button" onClick={() => fileRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); handleFiles(event.dataTransfer.files); }} className="grid min-h-48 place-items-center rounded-3xl border border-dashed border-border bg-muted p-8 text-center transition hover:border-signal">
        <span>
          <Camera className="mx-auto size-10 text-signal" />
          <strong className="mt-4 block font-display text-xl">Real photos = 3x zyada visits</strong>
          <span className="mt-2 block text-sm text-muted-foreground">Drag and drop or browse. Min 3, max 12, each 8 MB.</span>
          <span className="mt-5 inline-flex rounded-lg bg-gradient-signal px-4 py-2 text-sm font-bold text-signal-foreground"><UploadCloud className="mr-2 size-4" />Browse</span>
        </span>
      </button>
      {uploadQueue.length ? (
        <div className="grid gap-3">
          {uploadQueue.map((item) => (
            <div key={item.id} className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-3 text-sm font-semibold"><span className="truncate">{item.file.name}</span><span>{item.progress}%</span></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-signal" style={{ width: `${item.progress}%` }} /></div>
            </div>
          ))}
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {room.photos.map((photo, index) => (
          <div key={photo.id || photo.url} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-float">
            <div className="relative aspect-[16/10]">
              <img src={photo.url} alt={`${room.title || "Room"} - photo ${index + 1}`} loading="lazy" className="h-full w-full object-cover" />
              {photo.isCover ? <span className="absolute left-3 top-3 rounded-full bg-verified px-2 py-1 text-xs font-bold text-background">Cover</span> : null}
              <div className="absolute inset-0 hidden items-center justify-center gap-2 bg-foreground/40 group-hover:flex">
                <Button type="button" size="sm" variant="signal" onClick={() => setCover(index)}>Set cover</Button>
                <Button type="button" size="icon" variant="outline" onClick={() => movePhoto(index, -1)}><GripVertical className="size-4" /></Button>
                <Button type="button" size="icon" variant="outline" onClick={() => deletePhoto(index)}><Trash2 className="size-4" /></Button>
              </div>
            </div>
            <Input className="rounded-none border-0 border-t border-border" value={photo.caption} onChange={(event) => updateCaption(index, event.target.value)} placeholder="Caption" />
          </div>
        ))}
      </div>
      <p className="text-sm font-semibold text-muted-foreground">{room.photos.length}/12 uploaded. Minimum 3 required.</p>
    </div>
  );
}

function AmenitiesStep({ room, toggleList, customAmenity, setCustomAmenity, customRule, setCustomRule }) {
  function addCustom(key, value, setter) {
    const clean = value.trim();
    if (!clean) return;
    toggleList(key, clean);
    setter("");
  }
  return (
    <div className="grid gap-7">
      <ChipSection title="Amenities" values={AMENITIES} selected={room.amenities} onToggle={(value) => toggleList("amenities", value)} />
      <div className="grid gap-2 min-[420px]:grid-cols-[minmax(0,1fr)_auto]">
        <Input value={customAmenity} onChange={(event) => setCustomAmenity(event.target.value)} placeholder="+ Add custom amenity" />
        <Button className="w-full min-[420px]:w-auto" type="button" variant="outline" onClick={() => addCustom("amenities", customAmenity, setCustomAmenity)}>Add</Button>
      </div>
      <ChipSection title="House rules" values={RULES} selected={room.rules} onToggle={(value) => toggleList("rules", value)} />
      <div className="grid gap-2 min-[420px]:grid-cols-[minmax(0,1fr)_auto]">
        <Input value={customRule} onChange={(event) => setCustomRule(event.target.value)} placeholder="+ Add custom rule" />
        <Button className="w-full min-[420px]:w-auto" type="button" variant="outline" onClick={() => addCustom("rules", customRule, setCustomRule)}>Add</Button>
      </div>
      <div className="rounded-2xl border border-border bg-muted p-4">
        <h3 className="font-display text-base font-bold">Selected rules</h3>
        <div className="mt-3 grid gap-2">
          {room.rules.map((rule, index) => <div key={rule} className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-sm"><GripVertical className="size-4 text-muted-foreground" />{index + 1}. {rule}</div>)}
          {!room.rules.length ? <p className="text-sm text-muted-foreground">Select up to 12 rules.</p> : null}
        </div>
      </div>
    </div>
  );
}

function ChipSection({ title, values, selected, onToggle }) {
  return (
    <div>
      <h3 className="font-display text-base font-bold">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.map((value) => (
          <button key={value} type="button" onClick={() => onToggle(value)} className={cn("rounded-full border px-3.5 py-2 text-xs font-bold transition", selected.includes(value) ? "border-signal bg-signal/15 text-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground")}>{value}</button>
        ))}
      </div>
    </div>
  );
}

function RoomPreviewCard({ room }) {
  const cover = room.photos.find((photo) => photo.isCover) || room.photos[0];
  const amenities = room.amenities || [];
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-float transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="relative aspect-[16/10] bg-gradient-to-br from-signal/20 to-verified/10">
        {cover?.url ? <img src={cover.url} alt={`${room.title || "Room"} - cover`} loading="lazy" className="h-full w-full object-cover" /> : <div className="rule-grid absolute inset-0" />}
        <span className="absolute left-3 top-3"><StatusPill status={room.status || "draft"} /></span>
        <span className="absolute right-3 top-3 rounded-full bg-card/90 px-2 py-1 text-xs font-bold"><Camera className="mr-1 inline size-3" />{room.photos.length}</span>
        <span className="absolute bottom-3 right-3 rounded-full bg-gradient-signal px-3 py-1.5 text-xs font-bold text-signal-foreground">{formatINR(room.rent)} /month</span>
      </div>
      <div className="p-5">
        <h3 className="truncate font-display text-lg font-bold">{room.title || "Room title"}</h3>
        <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4 text-signal" />{room.locality || "Locality"} · {room.city || "City"}</p>
        <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground"><Home className="size-4 text-signal" />{room.type} · {room.gender}</p>
        <p className="mt-2 text-sm font-semibold text-verified">Available occupancy: {Number(room.availableOccupancy ?? room.maxOccupancy ?? 1)} / {room.maxOccupancy || 1}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {amenities.slice(0, 3).map((item) => <span key={item} className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">{item}</span>)}
          {amenities.length > 3 ? <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">+{amenities.length - 3}</span> : null}
        </div>
        <div className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
          <span className="grid size-8 place-items-center rounded-full bg-gradient-signal text-xs font-bold text-signal-foreground">{room.owner?.[0] || "O"}</span>
          <span className="truncate">{room.owner}</span>
          {room.ownerVerified ? <BadgeCheck className="size-4 text-verified" /> : null}
        </div>
      </div>
    </article>
  );
}
