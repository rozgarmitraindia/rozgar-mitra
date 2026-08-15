import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Heart,
  Home,
  IndianRupee,
  MapPin,
  MessageCircle,
  Phone,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import { getSession } from "../../utils/auth.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { useToast } from "../../contexts/ToastContext.jsx";
import { fetchRoomDetail, requestRoomVisit, toggleRoomSaved } from "../candidate/candidateApi.js";
import { Button } from "../../components/ui/button.jsx";
import { StatusPill } from "../../components/primitives/StatusPill.jsx";
import { cn } from "../../lib/utils.js";

const visitSlots = ["Morning", "Afternoon", "Evening"];

function formatINR(value) {
  const number = Number(value || 0);
  if (!number) return "Not disclosed";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(number);
}

function displayDate(value) {
  if (!value) return "Available soon";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return String(value);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function photosOf(room) {
  return (room?.photos || []).map((photo, index) => typeof photo === "string" ? { id: `photo-${index}`, url: photo, caption: `${room.title} - photo ${index + 1}`, isCover: index === 0 } : photo).filter((photo) => photo?.url);
}

function maskPhone(value) {
  if (!value) return "Login to view";
  const clean = String(value);
  if (clean.length < 6) return "Login to view";
  return `${clean.slice(0, 4)}xxxx${clean.slice(-2)}`;
}

function setMeta(name, content, property = false) {
  if (!content) return;
  let tag = document.head.querySelector(`meta[${property ? "property" : "name"}="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(property ? "property" : "name", name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

export default function RoomDetails() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const toast = useToast();
  const reduceMotion = useReducedMotion();
  const [room, setRoom] = useState(null);
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [paused, setPaused] = useState(false);
  const [slot, setSlot] = useState("Morning");
  const [visitDate, setVisitDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const session = getSession();
  const photos = useMemo(() => photosOf(room), [room]);

  useEffect(() => {
    async function loadRoom() {
      setLoading(true);
      setError("");
      try {
        const item = await fetchRoomDetail(roomId);
        setRoom(item);
        const title = `${item.title || "Room"} | Rozgar Mitra`;
        const description = item.description || "Verified room listing on Rozgar Mitra.";
        const cover = photosOf(item)[0]?.url;
        document.title = title;
        setMeta("description", description);
        setMeta("og:title", title, true);
        setMeta("og:description", description, true);
        if (cover && /^https?:\/\//i.test(cover)) {
          setMeta("og:image", cover, true);
          setMeta("twitter:image", cover);
        }
      } catch (err) {
        setError(err.message || "This room didn't load");
      } finally {
        setLoading(false);
      }
    }
    loadRoom();
  }, [roomId]);

  useEffect(() => {
    if (reduceMotion || paused || lightbox || photos.length <= 1) return undefined;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % photos.length), 4000);
    return () => window.clearInterval(timer);
  }, [reduceMotion, paused, lightbox, photos.length]);

  useEffect(() => {
    function onVisibility() {
      setPaused(document.hidden);
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!lightbox) return undefined;
    document.body.style.overflow = "hidden";
    function keydown(event) {
      if (event.key === "Escape") setLightbox(false);
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", keydown);
    };
  }, [lightbox, photos.length]);

  function prev() {
    setActive((value) => (value - 1 + photos.length) % photos.length);
  }

  function next() {
    setActive((value) => (value + 1) % photos.length);
  }

  async function handleVisitRequest() {
    if (!session || session.role !== "candidate") {
      navigate("/login", { state: { from: `/rooms/${roomId}`, role: "candidate", error: "Login to book a room visit." } });
      return;
    }
    setRequesting(true);
    try {
      await requestRoomVisit(roomId, { visitDate, visitTime: slot });
      toast.show("Visit request submitted for admin review. The owner will receive it after approval.", "success");
    } catch (err) {
      toast.show(err.message || "Unable to send visit request.", "error");
    } finally {
      setRequesting(false);
    }
  }

  async function handleSave() {
    if (!session || session.role !== "candidate") {
      navigate("/login", { state: { from: `/rooms/${roomId}`, role: "candidate", error: "Login to shortlist this room." } });
      return;
    }
    setSaving(true);
    try {
      const result = await toggleRoomSaved(roomId);
      setRoom((current) => ({ ...current, isSaved: result.data?.isSaved ?? !current.isSaved, savedCount: result.data?.savedCount ?? current.savedCount }));
      toast.show(result.message || "Shortlist updated", "success");
    } catch (err) {
      toast.show(err.message || "Unable to update shortlist.", "error");
    } finally {
      setSaving(false);
    }
  }

  function copyLink() {
    navigator.clipboard?.writeText(window.location.href);
    toast.show("Room link copied", "success");
  }

  if (loading) {
    return <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6"><h1 className="font-display text-3xl font-bold">Loading room details...</h1></section>;
  }

  if (error) {
    return <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6"><h1 className="font-display text-3xl font-bold">This room didn't load</h1><p className="mt-3 text-muted-foreground">{error}</p><Button className="mt-6" variant="signal" onClick={() => window.location.reload()}>Retry</Button></section>;
  }

  if (!room) {
    return <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6"><h1 className="font-display text-3xl font-bold">This room is no longer listed</h1><Link to="/rooms"><Button className="mt-6" variant="signal">Browse rooms</Button></Link></section>;
  }

  const showPhone = Boolean(room.contactUnlocked);
  const activePhoto = photos[active];

  return (
    <>
      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-4 pb-14 pt-8 sm:px-6">
          <Link to="/rooms" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Back to rooms</Link>
          {room.status !== "live" ? <div className="mt-5 rounded-2xl border border-pending/30 bg-pending/10 p-4 text-sm font-semibold">Under review. This listing may not be visible publicly.</div> : null}
          <Gallery photos={photos} title={room.title} active={active} setActive={setActive} prev={prev} next={next} setLightbox={setLightbox} setPaused={setPaused} />

          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.55fr)_380px]">
            <main>
              <div className="flex flex-wrap items-center gap-3">
                <StatusPill status={room.status || "live"} />
                <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-bold text-muted-foreground">{room.publicId || room.roomId}</span>
              </div>
              <h1 className="mt-4 font-display text-4xl font-bold leading-tight">{room.title}</h1>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-signal" />{room.locality} · {room.city}</span>
                <span className="inline-flex items-center gap-1.5"><CalendarClock className="size-4 text-signal" />{displayDate(room.availableFrom)}</span>
                <span>{room.type} · {room.furnishing} · {room.gender}</span>
                <span>Floor {room.floor || "-"} / {room.totalFloors || "-"}</span>
                <span>{room.areaSqft || "-"} sqft</span>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Fact icon={IndianRupee} label="Rent" value={`${formatINR(room.rent)} /month`} />
                <Fact icon={IndianRupee} label="Deposit" value={formatINR(room.deposit)} />
                <Fact icon={Home} label="Room type" value={room.type || room.roomType} />
                <Fact icon={CheckCircle2} label="Furnishing" value={room.furnishing} />
                <Fact icon={ShieldAlert} label="Bathroom" value={room.bathroom} />
                <Fact icon={Users} label="Max occupancy" value={room.maxOccupancy || "-"} />
                <Fact icon={Users} label="Available occupancy" value={room.availableOccupancy ?? room.maxOccupancy ?? "-"} />
              </div>

              <Section title="About this room"><p className="text-muted-foreground">{room.description || "No description available."}</p></Section>
              <Section title="Amenities">
                <div className="grid gap-3 sm:grid-cols-2">
                  {(room.amenities || []).map((item) => <span key={item} className="inline-flex items-center gap-2 rounded-xl bg-verified/10 px-3 py-2 text-sm font-semibold"><CheckCircle2 className="size-4 text-verified" />{item}</span>)}
                </div>
              </Section>
              <Section title="House rules">
                <div className="grid gap-3">
                  {(room.rules || []).map((item) => <span key={item} className="inline-flex items-start gap-2 text-sm text-muted-foreground"><ShieldAlert className="mt-0.5 size-4 shrink-0 text-pending" />{item}</span>)}
                </div>
              </Section>
              <Section title="Location">
                <div className="rounded-2xl border border-border bg-card p-5 shadow-float">
                  <p className="font-semibold">{room.address}</p>
                  {room.landmark ? <p className="mt-2 text-sm text-muted-foreground">Landmark: {room.landmark}</p> : null}
                  {room.mapLink || room.googleMapLink ? <a href={room.mapLink || room.googleMapLink} target="_blank" rel="noreferrer"><Button className="mt-4" variant="outline">Open in Google Maps</Button></a> : null}
                  <div className="mt-5 grid gap-2">
                    {(room.nearby || []).map((item) => <span key={`${item.label}-${item.distance}`} className="flex justify-between rounded-xl bg-muted px-3 py-2 text-sm"><b>{item.label}</b><span className="text-muted-foreground">{item.distance}</span></span>)}
                  </div>
                </div>
              </Section>
              <Section title="Owner">
                <div className="rounded-2xl border border-border bg-card p-5 shadow-float">
                  <div className="flex items-center gap-3">
                    <span className="grid size-12 place-items-center rounded-2xl bg-gradient-signal font-bold text-signal-foreground">{(room.owner || "O")[0]}</span>
                    <div>
                      <h3 className="inline-flex items-center gap-2 font-display text-lg font-bold">{room.owner || room.ownerName}{room.ownerVerified ? <BadgeCheck className="size-5 text-verified" /> : null}</h3>
                      <p className="text-sm text-muted-foreground">{room.ownerPublicId || room.immutableOwnerId} · Preferred contact {room.preferredContactTime || "10am - 7pm"}</p>
                    </div>
                  </div>
                  <Link to="/rooms" className="mt-4 inline-flex text-sm font-bold text-signal">Listings by this owner</Link>
                </div>
              </Section>
              <div className="mt-8 rounded-2xl border border-border bg-muted p-5 text-sm text-muted-foreground">
                <strong className="text-foreground">Safety note:</strong> Advance payment mat karo. Visit karke hi book karo. Rozgar Mitra se hi baat karo.
              </div>
              {room.similarRooms?.length ? <Section title="Similar rooms"><div className="grid gap-4 md:grid-cols-3">{room.similarRooms.map((item) => <SmallRoom key={item._id || item.id} room={item} />)}</div></Section> : null}
            </main>

            <aside className="h-fit rounded-3xl border border-border bg-card p-6 shadow-lift lg:sticky lg:top-24">
              <div className="font-display text-3xl font-bold">{formatINR(room.rent)} <span className="text-base font-semibold text-muted-foreground">/month</span></div>
              <p className="mt-2 text-sm text-muted-foreground">Deposit {formatINR(room.deposit)} · Maintenance {formatINR(room.maintenance)}</p>
              <span className="mt-3 inline-flex rounded-full bg-verified/10 px-3 py-1 text-xs font-bold text-foreground">{room.electricityIncluded ? "Electricity included" : "Electricity billed separately"}</span>
              <label className="mt-6 grid gap-2 text-sm font-bold">Visit date<input className="h-10 rounded-lg border border-border bg-card px-3 text-sm" type="date" value={visitDate} onChange={(event) => setVisitDate(event.target.value)} /></label>
              <div className="mt-4">
                <p className="text-sm font-bold">Time slot</p>
                <div className="mt-2 flex flex-wrap gap-2">{visitSlots.map((item) => <button key={item} type="button" onClick={() => setSlot(item)} className={cn("rounded-full border px-3 py-1.5 text-xs font-bold", slot === item ? "border-signal bg-signal/15" : "border-border text-muted-foreground")}>{item}</button>)}</div>
              </div>
              <Button className="mt-6 w-full" variant="signal" size="xl" onClick={handleVisitRequest} disabled={requesting}>{requesting ? "Booking..." : "Book visit"}</Button>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => !session ? navigate("/login", { state: { from: `/rooms/${roomId}`, role: "candidate" } }) : toast.show("Owner chat will open soon.", "info")}><MessageCircle className="size-4" />Chat</Button>
                <Button variant="outline" disabled={!showPhone} title={showPhone ? "Owner contact" : "Contact unlocks after admin and owner approval"}><Phone className="size-4" />{showPhone ? room.ownerPhone || room.contactNumber || "Call" : "Contact locked"}</Button>
              </div>
              {room.ownerWhatsapp ? <a href={showPhone ? `https://wa.me/${String(room.ownerWhatsapp).replace(/\D/g, "")}` : undefined} onClick={(event) => { if (!showPhone) { event.preventDefault(); navigate("/login", { state: { from: `/rooms/${roomId}`, role: "candidate" } }); } }}><Button className="mt-2 w-full" variant="outline">WhatsApp {showPhone ? "" : maskPhone(room.ownerWhatsapp)}</Button></a> : null}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="ghost" onClick={handleSave} disabled={saving}><Heart className={cn("size-4", room.isSaved && "fill-current text-destructive")} />Save</Button>
                <Button variant="ghost" onClick={copyLink}><Copy className="size-4" />Share</Button>
              </div>
              <div className="mt-5 rounded-2xl bg-verified/10 p-4 text-sm text-muted-foreground">पहले Admin request review करेगा। Room owner के accept करने के बाद ही contact number unlock होगा।</div>
            </aside>
          </div>
        </div>
      </section>
      {lightbox && activePhoto ? createPortal(<Lightbox photos={photos} active={active} setActive={setActive} close={() => setLightbox(false)} prev={prev} next={next} zoom={zoom} setZoom={setZoom} title={room.title} />, document.body) : null}
    </>
  );
}

function Gallery({ photos, title, active, setActive, prev, next, setLightbox, setPaused }) {
  const activePhoto = photos[active];
  return (
    <div className="mt-8" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-signal/20 to-verified/10">
        <div className="aspect-[4/3] sm:aspect-video">
          {activePhoto ? (
            <AnimatePresence mode="wait">
              <motion.img key={activePhoto.url} src={activePhoto.url} alt={`${title} - photo ${active + 1}`} loading="lazy" className="h-full w-full cursor-zoom-in object-cover" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35 }} onClick={() => setLightbox(true)} drag="x" dragConstraints={{ left: 0, right: 0 }} onDragEnd={(_, info) => { if (info.offset.x > 80) prev(); if (info.offset.x < -80) next(); }} />
            </AnimatePresence>
          ) : <div className="rule-grid h-full w-full" />}
        </div>
        {photos.length > 1 ? <>
          <button className="glass absolute left-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full" type="button" onClick={prev}><ChevronLeft className="size-5" /></button>
          <button className="glass absolute right-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full" type="button" onClick={next}><ChevronRight className="size-5" /></button>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">{photos.map((photo, index) => <button key={photo.url} type="button" onClick={() => setActive(index)} className={cn("size-2 rounded-full", active === index ? "bg-signal" : "bg-card/70")} />)}</div>
          <span className="absolute bottom-4 right-4 rounded-full bg-card/90 px-3 py-1 text-xs font-bold">{active + 1} / {photos.length}</span>
        </> : null}
      </div>
      {photos.length ? <div className="mt-4 flex gap-3 overflow-x-auto pb-2">{photos.map((photo, index) => <button key={photo.url} type="button" onClick={() => setActive(index)} className={cn("h-20 w-28 shrink-0 overflow-hidden rounded-xl border", active === index ? "border-signal ring-2 ring-signal/30" : "border-border")}><img src={photo.url} alt={`${title} - thumbnail ${index + 1}`} loading="lazy" className="h-full w-full object-cover" /></button>)}</div> : null}
    </div>
  );
}

function Lightbox({ photos, active, close, prev, next, zoom, setZoom, title }) {
  const photo = photos[active];
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-foreground/90 p-4 backdrop-blur" role="dialog" aria-modal="true" onMouseDown={close}>
      <button className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-card text-foreground" type="button" onClick={close}><X className="size-5" /></button>
      <button className="absolute left-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-card text-foreground" type="button" onClick={(event) => { event.stopPropagation(); prev(); }}><ChevronLeft className="size-5" /></button>
      <button className="absolute right-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-card text-foreground" type="button" onClick={(event) => { event.stopPropagation(); next(); }}><ChevronRight className="size-5" /></button>
      <img src={photo.url} alt={`${title} - photo ${active + 1}`} className={cn("max-h-[82dvh] max-w-[92vw] object-contain transition", zoom && "scale-[2] cursor-zoom-out", !zoom && "cursor-zoom-in")} onMouseDown={(event) => event.stopPropagation()} onClick={() => setZoom(!zoom)} />
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-card px-4 py-2 text-sm font-semibold text-foreground">{photo.caption || title} · {active + 1} / {photos.length}</div>
    </div>
  );
}

function Fact({ icon: Icon, label, value }) {
  return <div className="rounded-2xl border border-border bg-card p-5 shadow-float"><Icon className="size-5 text-signal" /><p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p><strong className="mt-1 block font-display text-lg">{value || "-"}</strong></div>;
}

function Section({ title, children }) {
  return <section className="mt-10"><h2 className="font-display text-2xl font-bold">{title}</h2><div className="mt-4">{children}</div></section>;
}

function SmallRoom({ room }) {
  const photo = photosOf(room)[0];
  return <Link to={`/rooms/${room._id || room.id}`} className="overflow-hidden rounded-2xl border border-border bg-card shadow-float transition hover:-translate-y-0.5 hover:shadow-lift"><div className="aspect-[16/10] bg-muted">{photo ? <img src={photo.url} alt={`${room.title} - cover`} loading="lazy" className="h-full w-full object-cover" /> : null}</div><div className="p-4"><h3 className="truncate font-display font-bold">{room.title}</h3><p className="mt-1 text-sm text-muted-foreground">{formatINR(room.rent)} · {room.locality}</p></div></Link>;
}
