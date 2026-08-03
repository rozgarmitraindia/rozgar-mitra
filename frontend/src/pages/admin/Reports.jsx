import { useEffect, useState } from "react";
import { adminFetch } from "./adminApi.js";

export default function Reports() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch("/admin/reports/summary")
      .then((result) => setData(result.data || result))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <section className="form-card">
      <div className="section-label">Reports</div>
      <h1 className="form-title">Reports & Insights</h1>
      {error ? <div className="login-error">{error}</div> : null}
      <div className="admin-stats">
        {Object.entries(data || {}).flatMap(([group, rows]) => (rows || []).map((row) => (
          <div className="category-card" key={`${group}-${row._id}`}>
            <span className="cat-name-hi">{row.count}</span>
            <span className="cat-name-en">{group.replace(/([A-Z])/g, " $1").trim()}: {row._id || "Unknown"}</span>
          </div>
        )))}
      </div>
    </section>
  );
}
