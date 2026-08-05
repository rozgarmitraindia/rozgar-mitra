import { useState } from "react";
import { apiFetch, apiUpload, getSession } from "../../utils/auth.js";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext.jsx";

export default function PostRoom() {
  const navigate = useNavigate();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [rent, setRent] = useState("");
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const session = getSession();
    if (!session || session.role !== "roomOwner") return navigate("/login", { state: { role: "roomOwner", error: "Room Owner login required" } });
    try {
      setUploading(true);
      let photoUrls = [];
      if (photos.length) {
        const form = new FormData();
        photos.forEach((photo) => form.append("files", photo));
        const uploadResult = await apiUpload("/upload/room-photos", form);
        photoUrls = (uploadResult.data?.documents || uploadResult.documents || []).map((document) => document.url).filter(Boolean);
      }
      await apiFetch("/employer/rooms", { method: "POST", body: JSON.stringify({ title, rent, photos: photoUrls }) });
      toast.show("Room posted and pending admin review", "success");
      navigate("/room-owner/rooms");
    } catch (err) {
      toast.show(err.message, "error");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="form-page">
      <div className="section-header">
        <div className="section-label">Post Room</div>
        <h1 className="section-title">Post a Room / PG</h1>
      </div>
      <form className="form-card animated-card" onSubmit={submit}>
        <div className="form-group"><label className="form-label">Title</label><input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
        <div className="form-group"><label className="form-label">Rent</label><input className="form-input" value={rent} onChange={(e) => setRent(e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Room Photos</label><input className="form-input" type="file" accept="image/*" multiple onChange={(e) => setPhotos(Array.from(e.target.files || []))} /></div>
        <button className="btn-primary" disabled={uploading} type="submit">{uploading ? <><span className="loading-spinner" />Uploading photos & saving room...</> : "Submit"}</button>
      </form>
    </section>
  );
}
