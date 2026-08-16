import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Edit, Eye, PauseCircle, PlusCircle, Trash2 } from "lucide-react";
import { fetchRoomOwnerRooms, closeRoomOwnerRoom, duplicateRoomOwnerRoom, deleteRoomOwnerRoom } from "./roomOwnerApi.js";
import { useToast } from "../../contexts/ToastContext.jsx";
import { Button } from "../../components/ui/button.jsx";
import { StatusPill } from "../../components/primitives/StatusPill.jsx";

function formatINR(value) {
  const number = Number(value || 0);
  if (!number) return "-";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(number);
}

function getPhoto(room) {
  const first = (room.photos || [])[0];
  if (!first) return "";
  return typeof first === "string" ? first : first.url;
}

export default function RoomOwnerRooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const toast = useToast();

  async function load() {
    setLoading(true);
    setError("");
    try {
      const items = await fetchRoomOwnerRooms();
      setRooms(items);
    } catch (err) {
      setError(err.message || "Unable to load rooms.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function closeRoom(room) {
    const reason = window.prompt("Close reason", "Room is not available right now");
    if (!reason) return;
    setBusy(room._id);
    try {
      await closeRoomOwnerRoom(room._id, reason);
      toast.show("Room listing closed", "success");
      await load();
    } catch (err) {
      toast.show(err.message || "Unable to close room", "error");
    } finally {
      setBusy("");
    }
  }

  async function duplicateRoom(room) {
    setBusy(room._id);
    try {
      await duplicateRoomOwnerRoom(room._id);
      toast.show("Draft duplicate created", "success");
      await load();
    } catch (err) {
      toast.show(err.message || "Unable to duplicate room", "error");
    } finally {
      setBusy("");
    }
  }

  async function deleteRoom(room) {
    const confirmed = window.confirm(`"${room.title || room.propertyName || "Room"}" permanently delete karna hai? Related visit requests/bookings bhi delete ho jayengi. Ye action undo nahi hoga.`);
    if (!confirmed) return;
    setBusy(room._id);
    try {
      await deleteRoomOwnerRoom(room._id);
      toast.show("Room permanently deleted", "success");
      await load();
    } catch (err) {
      toast.show(err.message || "Unable to delete room", "error");
    } finally {
      setBusy("");
    }
  }

  const draftRooms = rooms.filter((room) => room.status === "draft");
  const activeRooms = rooms.filter((room) => room.status !== "draft");

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <div className="section-label">Owner Listings</div>
          <h1 className="font-display text-4xl font-bold">Room Listing Manager</h1>
          <p className="mt-2 text-muted-foreground">Status, requests, edits, duplicate drafts, and public preview in one place.</p>
        </div>
        <Link className="w-full lg:w-auto" to="/post-room"><Button className="w-full lg:w-auto" variant="signal"><PlusCircle className="size-4" />Add New Room</Button></Link>
      </div>

      {error ? <div className="mt-6 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-semibold text-destructive">{error}</div> : null}

      <RoomSection title="Draft Rooms" subtitle="Draft listings yahin se edit, submit, duplicate ya permanently delete ho sakti hain." rooms={draftRooms} loading={loading} busy={busy} closeRoom={closeRoom} duplicateRoom={duplicateRoom} deleteRoom={deleteRoom} emptyText="No draft rooms." />

      <RoomSection title="Submitted & Live Rooms" subtitle="Pending, live, rejected, and closed listings." rooms={activeRooms} loading={loading} busy={busy} closeRoom={closeRoom} duplicateRoom={duplicateRoom} deleteRoom={deleteRoom} emptyText="No submitted rooms yet." />
    </section>
  );
}

function RoomSection({ title, subtitle, rooms, loading, busy, closeRoom, duplicateRoom, deleteRoom, emptyText }) {
  return (
    <div className="mt-8">
      <div className="mb-4">
        <h2 className="font-display text-2xl font-bold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="grid gap-4">
        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-muted-foreground shadow-float">Loading rooms...</div>
        ) : rooms.length ? rooms.map((room) => {
          const photo = getPhoto(room);
          return (
            <article key={room._id} className="overflow-hidden rounded-3xl border border-border bg-card shadow-float">
              {room.status === "rejected" ? (
                <div className="border-b border-destructive/20 bg-destructive/10 px-5 py-3 text-sm font-semibold text-destructive">
                  Rejected: {room.statusReason || room.adminReason || "Admin reason not available"} · Fix & resubmit
                </div>
              ) : null}
              <div className="grid gap-4 p-5 lg:grid-cols-[96px_minmax(0,1fr)_auto] lg:items-center">
                <div className="h-24 overflow-hidden rounded-2xl bg-gradient-to-br from-signal/20 to-verified/10">
                  {photo ? <img src={photo} alt={`${room.title || "Room"} cover`} loading="lazy" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-display text-xl font-bold">{room.title || room.propertyName || "Untitled room"}</h2>
                    <StatusPill status={room.status || "pending"} />
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-5">
                    <span><b className="text-foreground">Public ID</b><br />{room.publicId || room.roomId}</span>
                    <span><b className="text-foreground">City</b><br />{room.city || room.address || "-"}</span>
                    <span><b className="text-foreground">Rent</b><br />{formatINR(room.rent)}</span>
                    <span><b className="text-foreground">Views</b><br />{room.views || 0}</span>
                    <span><b className="text-foreground">Requests</b><br />{room.requests || 0}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Updated {room.updatedAt ? new Date(room.updatedAt).toLocaleString("en-IN") : "-"}</p>
                </div>
                <div className="room-owner-action-grid lg:max-w-[360px] lg:justify-end">
                  <Link className="min-w-0" to={`/post-room?roomId=${room._id}`}><Button className="w-full" variant="outline" size="sm"><Edit className="size-4" />Edit</Button></Link>
                  <Button className="w-full" variant="outline" size="sm" disabled={busy === room._id} onClick={() => closeRoom(room)}><PauseCircle className="size-4" />Pause/Close</Button>
                  <Button className="w-full" variant="outline" size="sm" disabled={busy === room._id} onClick={() => duplicateRoom(room)}><Copy className="size-4" />Duplicate</Button>
                  <Button className="w-full" variant="outline" size="sm" disabled={busy === room._id} onClick={() => deleteRoom(room)}><Trash2 className="size-4" />Delete room</Button>
                  {room.status === "live" ? <Link className="min-w-0" to={`/rooms/${room._id}`}><Button className="w-full" variant="signal" size="sm"><Eye className="size-4" />View public</Button></Link> : null}
                </div>
              </div>
            </article>
          );
        }) : (
          <div className="rounded-3xl border border-dashed border-border p-12 text-center">
            <h2 className="font-display text-2xl font-bold">{emptyText}</h2>
            <p className="mt-2 text-muted-foreground">Create a listing and submit it for admin approval.</p>
            <Link to="/post-room"><Button className="mt-6" variant="signal">Post a room</Button></Link>
          </div>
        )}
      </div>
    </div>
  );
}
