import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import Home from "./publicpages/Home.jsx";
const BrowseJobs = lazy(() => import("./pages/candidate/BrowseJobs.jsx"));
const BrowseRooms = lazy(() => import("./pages/roomOwner/BrowseRooms.jsx"));
const JobDetails = lazy(() => import("./pages/candidate/JobDetails.jsx"));
const RoomDetails = lazy(() => import("./pages/roomOwner/RoomDetails.jsx"));
const PostJob = lazy(() => import("./pages/employer/PostJob.jsx"));
const PostRoom = lazy(() => import("./pages/roomOwner/PostRoom.jsx"));
const EmployerDashboard = lazy(() => import("./pages/employer/Dashboard.jsx"));
const EmployerJobs = lazy(() => import("./pages/employer/Jobs.jsx"));
const EmployerApplications = lazy(() => import("./pages/employer/Applications.jsx"));
const EmployerNotifications = lazy(() => import("./pages/employer/Notifications.jsx"));
const EmployerProfile = lazy(() => import("./pages/employer/Profile.jsx"));
const EmployerSettings = lazy(() => import("./pages/employer/Settings.jsx"));
const RoomOwnerDashboard = lazy(() => import("./pages/roomOwner/Dashboard.jsx"));
const RoomOwnerRooms = lazy(() => import("./pages/roomOwner/Rooms.jsx"));
const RoomOwnerVisitRequests = lazy(() => import("./pages/roomOwner/VisitRequests.jsx"));
const RoomOwnerBookings = lazy(() => import("./pages/roomOwner/Bookings.jsx"));
const RoomOwnerNotifications = lazy(() => import("./pages/roomOwner/Notifications.jsx"));
const RoomOwnerProfile = lazy(() => import("./pages/roomOwner/Profile.jsx"));
const RoomOwnerSettings = lazy(() => import("./pages/roomOwner/Settings.jsx"));
import About from "./publicpages/About.jsx";
import Contact from "./publicpages/Contact.jsx";
import Login from "./auth/Login.jsx";
import Register from "./auth/Register.jsx";
import VerifyEmail from "./auth/VerifyEmail.jsx";
import ForgotPassword from "./auth/ForgotPassword.jsx";
import GoogleCallback from "./auth/GoogleCallback.jsx";
const AdminPanel = lazy(() => import("./pages/admin/AdminPanel.jsx"));
const CandidateDashboard = lazy(() => import("./pages/candidate/Dashboard.jsx"));
const CandidateProfile = lazy(() => import("./pages/candidate/Profile.jsx"));
const EditProfile = lazy(() => import("./pages/candidate/EditProfile.jsx"));
const Resume = lazy(() => import("./pages/candidate/Resume.jsx"));
const SavedJobs = lazy(() => import("./pages/candidate/SavedJobs.jsx"));
const AppliedJobs = lazy(() => import("./pages/candidate/AppliedJobs.jsx"));
const Interviews = lazy(() => import("./pages/candidate/Interviews.jsx"));
const CandidateNotifications = lazy(() => import("./pages/candidate/Notifications.jsx"));
const CandidateSettings = lazy(() => import("./pages/candidate/Settings.jsx"));
import { RoleLayout } from "./components/RouteLayouts.jsx";
import ProtectedRole from "./components/ProtectedRole.jsx";

import { LanguageProvider } from "./contexts/LanguageContext.jsx";
import { ToastProvider } from "./contexts/ToastContext.jsx";
import NotificationRegistrar from "./NotificationRegistrar.jsx";
import WhatsAppFloat from "./components/WhatsAppFloat.jsx";
import AutoTranslate from "./components/AutoTranslate.jsx";

function protectedRoleLayout(role, element) {
  return (
    <ProtectedRole role={role}>
      <RoleLayout role={role}>{element}</RoleLayout>
    </ProtectedRole>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <LanguageProvider>
        <NotificationRegistrar />
        <AutoTranslate>
          <Navbar />
          <main>
            <Suspense fallback={<section className="section"><div className="section-header"><h1 className="section-title">Loading...</h1></div></section>}>
              <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/jobs" element={<BrowseJobs />} />
                  <Route path="/jobs/:jobId" element={<JobDetails />} />
                  <Route path="/rooms" element={<BrowseRooms />} />
                  <Route path="/rooms/:roomId" element={<RoomDetails />} />
                  <Route path="/post-job" element={protectedRoleLayout("employer", <PostJob />)} />
                  <Route path="/post-room" element={protectedRoleLayout("roomOwner", <PostRoom />)} />
                  <Route path="/join-free" element={<Register />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/signup" element={<Register />} />
                  <Route path="/verify" element={<VerifyEmail />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/google-callback" element={<GoogleCallback />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/dashboard" element={protectedRoleLayout("candidate", <CandidateDashboard />)} />
                  <Route path="/profile" element={protectedRoleLayout("candidate", <CandidateProfile />)} />
                  <Route path="/edit-profile" element={protectedRoleLayout("candidate", <EditProfile />)} />
                  <Route path="/resume" element={protectedRoleLayout("candidate", <Resume />)} />
                  <Route path="/saved-jobs" element={protectedRoleLayout("candidate", <SavedJobs />)} />
                  <Route path="/applied-jobs" element={protectedRoleLayout("candidate", <AppliedJobs />)} />
                  <Route path="/interviews" element={protectedRoleLayout("candidate", <Interviews />)} />
                  <Route path="/notifications" element={protectedRoleLayout("candidate", <CandidateNotifications />)} />
                  <Route path="/settings" element={protectedRoleLayout("candidate", <CandidateSettings />)} />
                  <Route path="/employer/dashboard" element={protectedRoleLayout("employer", <EmployerDashboard />)} />
                  <Route path="/employer/jobs" element={protectedRoleLayout("employer", <EmployerJobs />)} />
                  <Route path="/employer/applications" element={protectedRoleLayout("employer", <EmployerApplications />)} />
                  <Route path="/employer/notifications" element={protectedRoleLayout("employer", <EmployerNotifications />)} />
                  <Route path="/employer/profile" element={protectedRoleLayout("employer", <EmployerProfile />)} />
                  <Route path="/employer/settings" element={protectedRoleLayout("employer", <EmployerSettings />)} />
                  <Route path="/room-owner/dashboard" element={protectedRoleLayout("roomOwner", <RoomOwnerDashboard />)} />
                  <Route path="/room-owner/rooms" element={protectedRoleLayout("roomOwner", <RoomOwnerRooms />)} />
                  <Route path="/app/owner" element={protectedRoleLayout("roomOwner", <RoomOwnerRooms />)} />
                  <Route path="/room-owner/visit-requests" element={protectedRoleLayout("roomOwner", <RoomOwnerVisitRequests />)} />
                  <Route path="/room-owner/bookings" element={protectedRoleLayout("roomOwner", <RoomOwnerBookings />)} />
                  <Route path="/room-owner/notifications" element={protectedRoleLayout("roomOwner", <RoomOwnerNotifications />)} />
                  <Route path="/room-owner/profile" element={protectedRoleLayout("roomOwner", <RoomOwnerProfile />)} />
                  <Route path="/room-owner/settings" element={protectedRoleLayout("roomOwner", <RoomOwnerSettings />)} />
                  <Route path="/admin" element={<ProtectedRole role="admin"><AdminPanel /></ProtectedRole>} />
              </Routes>
            </Suspense>
          </main>
          <WhatsAppFloat />
          <Footer />
        </AutoTranslate>
      </LanguageProvider>
    </ToastProvider>
  );
}
