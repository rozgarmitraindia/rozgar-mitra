import { Navigate, useLocation } from "react-router-dom";
import { getSession } from "../utils/auth.js";

const roleMessages = {
  employer: "Post job karne ke liye company account login compulsory hai.",
  roomOwner: "Room post karne ke liye room owner account login compulsory hai.",
  candidate: "Apply karne ke liye candidate account login compulsory hai.",
  admin: "Admin panel access ke liye admin login required hai.",
};

export default function ProtectedRole({ role, children }) {
  const location = useLocation();
  const session = getSession();
  const hasRole = session?.role === role || (role === "admin" && session?.role === "superAdmin");

  if (!session?.token || !hasRole) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
          error: roleMessages[role] || "Login required to access this page.",
          role,
        }}
      />
    );
  }

  return children;
}
