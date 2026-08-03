import ListModule from "./ListModule.jsx";

export default function Admins({ onNavigate }) {
  return (
    <>
      <div className="admin-list-head">
        <div>
          <div className="section-label">Admins</div>
          <h1 className="form-title">Admin Accounts</h1>
        </div>
        <button className="btn-search" type="button" onClick={() => onNavigate?.("settings")}>Create Admin</button>
      </div>
      <ListModule moduleKey="admins" />
    </>
  );
}
