import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export function resolveFrontendUrl() {
  return (process.env.MAIL_FRONTEND_URL || "https://rozgarmitra-india.com").trim().replace(/\/$/, "");
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isAlreadyBrandedEmail(html = "") {
  const text = String(html || "");
  return text.includes("data-rm-email") || (text.includes("Rozgar Mitra") && text.includes("max-width:600px") && text.includes("box-shadow"));
}

export function renderEmailTemplate({ title, headline, body, buttonText, buttonLink, note, footer, rawBody = false, details = [] }) {
  const frontend = resolveFrontendUrl();
  const safeButtonLink = buttonLink || frontend;
  const bodyHtml = rawBody ? (body || "") : escapeHtml(body || "").replace(/\n/g, "<br />");
  const noteHtml = rawBody ? (note || "") : escapeHtml(note || "").replace(/\n/g, "<br />");

  return `
    <div data-rm-email="true" style="margin:0;background:#f5f3ee;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td align="center" style="padding:28px 16px;background:#111827;">
            <a href="${safeButtonLink}" style="text-decoration:none;color:#f7b23b;font-size:24px;font-weight:800;letter-spacing:.4px;">Rozgar Mitra</a>
            <div style="font-size:12px;color:rgba(255,255,255,.76);margin-top:5px;letter-spacing:.14em;text-transform:uppercase;">Jobs · Rooms · Growth</div>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:24px 16px 34px;">
            <div style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e7e1d6;border-radius:20px;overflow:hidden;box-shadow:0 20px 46px rgba(17,24,39,.16);">
              <div style="height:5px;background:linear-gradient(90deg,#f7b23b 0%,#f97316 55%,#14b8a6 100%);"></div>
              <div style="padding:30px 30px 26px;">
                <p style="margin:0 0 10px 0;font-size:12px;font-weight:800;color:#c45d00;text-transform:uppercase;letter-spacing:1.4px;">${escapeHtml(title || "Rozgar Mitra Update")}</p>
                <h1 style="margin:0 0 18px 0;font-size:28px;line-height:1.15;color:#111827;">${escapeHtml(headline || title || "Notification")}</h1>
                <div style="margin:0 0 22px 0;color:#4b5563;font-size:16px;line-height:1.72;">${bodyHtml}</div>
                ${details.length ? `
                  <div style="margin:18px 0;border:1px solid #ece6dc;border-radius:16px;overflow:hidden;">
                    ${details.map(([label, value], index) => `
                      <div style="display:flex;${index < details.length - 1 ? "border-bottom:1px solid #ece6dc;" : ""}">
                        <div style="width:38%;padding:12px 14px;background:#fbfaf7;color:#6b7280;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">${escapeHtml(label)}</div>
                        <div style="width:62%;padding:12px 14px;color:#111827;font-size:14px;font-weight:700;">${rawBody ? value : escapeHtml(value)}</div>
                      </div>
                    `).join("")}
                  </div>
                ` : ""}
                ${buttonText && safeButtonLink ? `
                  <div style="margin:24px 0;text-align:center;">
                    <a href="${safeButtonLink}" style="background:linear-gradient(135deg,#f7b23b,#f97316);color:#111827;padding:14px 24px;border-radius:999px;text-decoration:none;display:inline-block;font-size:15px;font-weight:800;box-shadow:0 12px 24px rgba(249,115,22,.24);">${escapeHtml(buttonText)}</a>
                  </div>
                ` : ""}
                ${note ? `<div style="margin:16px 0;padding:18px;border-radius:16px;background:#fbfaf7;border:1px solid #ece6dc;color:#4b5563;font-size:14px;line-height:1.7;">${noteHtml}</div>` : ""}
                ${footer ? `<p style="margin:18px 0 0 0;color:#6b7280;font-size:13px;line-height:1.7;">${escapeHtml(footer)}</p>` : ""}
              </div>
              <div style="background:#fbfaf7;padding:20px 30px;border-top:1px solid #ece6dc;color:#6b7280;font-size:13px;text-align:center;line-height:1.7;">
                <div>Visit <a href="${frontend}" style="color:#c45d00;text-decoration:none;font-weight:700;">${frontend}</a></div>
                <div>Powered by Origin Software</div>
                <div>© ${new Date().getFullYear()} Rozgar Mitra. All rights reserved.</div>
              </div>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;
}

export async function sendMail({ to, subject, html }) {
  if (!resend) {
    console.log("MAIL_SKIPPED_NO_RESEND_KEY", { to, subject });
    return;
  }
  const finalHtml = isAlreadyBrandedEmail(html)
    ? html
    : renderEmailTemplate({
        title: "Rozgar Mitra Update",
        headline: subject || "Rozgar Mitra notification",
        body: html || "",
        rawBody: true,
        buttonText: "Open Rozgar Mitra",
        buttonLink: resolveFrontendUrl(),
      });

  await resend.emails.send({
    from: process.env.MAIL_FROM,
    to,
    subject,
    html: finalHtml,
  });
}

export async function sendAccountStatusMail(user, status, reason = "") {
  const frontend = resolveFrontendUrl();
  const body = status === "verified"
    ? "Your account has been approved. You can now login and use Rozgar Mitra."
    : status === "suspended"
      ? "Your account has been suspended. Please review the note below."
      : `Your account status has changed to ${status}.`;

  await sendMail({
    to: user.email || user.companyEmail,
    subject: `Rozgar Mitra account ${status}`,
    html: renderEmailTemplate({
      title: "Account Update",
      headline: `Your account is ${status}`,
      body,
      buttonText: "Go to Rozgar Mitra",
      buttonLink: `${frontend}/login`,
      note: reason,
      details: [["Account", user.fullName || user.companyName || user.email || "-"], ["Status", status]],
    }),
  });
}

export async function sendJobStatusMail(user, job, status, reason = "") {
  const frontend = resolveFrontendUrl();
  await sendMail({
    to: user.email || user.companyEmail,
    subject: `Rozgar Mitra job ${status}`,
    html: renderEmailTemplate({
      title: "Job Update",
      headline: `Your job has been ${status}`,
      body: status === "live" ? "Your job is now live and visible to candidates." : "Your job status has been updated by admin.",
      buttonText: status === "live" ? "View job" : "Open dashboard",
      buttonLink: status === "live" ? `${frontend}/jobs/${job._id}` : `${frontend}/employer/jobs`,
      note: reason,
      details: [["Job", job.title || job.role || "Your job"], ["Status", status], ["Post ID", job.postId || "-"]],
    }),
  });
}

export async function sendRoomStatusMail(user, room, status, reason = "") {
  const frontend = resolveFrontendUrl();
  await sendMail({
    to: user.email || user.companyEmail,
    subject: `Rozgar Mitra room ${status}`,
    html: renderEmailTemplate({
      title: "Room Update",
      headline: `Your room has been ${status}`,
      body: status === "live" ? "Your room listing is now live and visible publicly." : "Your room listing status has been updated by admin.",
      buttonText: status === "live" ? "View room" : "Open dashboard",
      buttonLink: status === "live" ? `${frontend}/rooms/${room._id}` : `${frontend}/room-owner/rooms`,
      note: reason,
      details: [["Room", room.title || room.propertyName || "Your room"], ["Status", status], ["Room ID", room.roomId || "-"]],
    }),
  });
}

export async function sendInterviewScheduledMail(candidate, application) {
  const frontend = resolveFrontendUrl();
  const job = application.job || {};
  await sendMail({
    to: candidate.email,
    subject: `Interview scheduled - ${job.title || "Rozgar Mitra"}`,
    html: renderEmailTemplate({
      title: "Interview Scheduled",
      headline: `Interview scheduled for ${job.title || "your application"}`,
      body: "Your interview has been scheduled by the company. Please review the timing and instructions before joining.",
      buttonText: "View application",
      buttonLink: `${frontend}/applied-jobs`,
      details: Object.entries(application.interview || {}).map(([key, value]) => [key, String(value || "-")]),
    }),
  });
}

export async function sendApplicationDecisionMail(candidate, application, decision, reason = "") {
  const frontend = resolveFrontendUrl();
  const job = application.job || {};
  const hired = decision === "hired";
  await sendMail({
    to: candidate.email,
    subject: `Application ${decision} - ${job.title || "Rozgar Mitra"}`,
    html: renderEmailTemplate({
      title: "Application Update",
      headline: hired ? "Congratulations, you have been selected" : `Application update for ${job.title || "your application"}`,
      body: hired ? "Great news. The company has selected your application." : `Your application status has been updated to ${decision}.`,
      buttonText: "View application",
      buttonLink: `${frontend}/applied-jobs`,
      note: reason,
      details: [["Job", job.title || "-"], ["Status", decision]],
    }),
  });
}

export async function sendVisitRequestMail(owner, room, request, candidate = {}) {
  const frontend = resolveFrontendUrl();
  const requestedAt = request?.createdAt ? new Date(request.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "-";
  await sendMail({
    to: owner.email,
    subject: "New visit request",
    html: renderEmailTemplate({
      title: "Visit Request",
      headline: `New visit request for ${room.title || room.propertyName}`,
      body: "A candidate has requested a visit for your listing. Review the candidate profile and confirm the visit timing from your dashboard.",
      buttonText: "View requests",
      buttonLink: `${frontend}/room-owner/visit-requests`,
      details: [
        ["Room", room.title || room.propertyName || "-"],
        ["Room ID", room.publicId || room.roomId || "-"],
        ["Candidate", candidate.fullName || candidate.email || "-"],
        ["Candidate ID", candidate.immutableId || String(candidate._id || "-")],
        ["Mobile", candidate.mobile || candidate.phone || "-"],
        ["Email", candidate.email || "-"],
        ["Visit date", request?.visitDate || "Date not selected"],
        ["Visit time", request?.visitTime || "Time not selected"],
        ["Message", request?.message || "-"],
        ["Requested at", requestedAt],
      ],
    }),
  });
}

export async function sendBookingStatusMail(candidate, booking, status) {
  const frontend = resolveFrontendUrl();
  await sendMail({
    to: candidate.email,
    subject: `Booking ${status}`,
    html: renderEmailTemplate({
      title: "Booking Update",
      headline: `Booking ${status}`,
      body: `Your booking for ${booking.room?.title || booking.room?.propertyName || "the room"} has been ${status}.`,
      buttonText: "Open Rozgar Mitra",
      buttonLink: `${frontend}/rooms`,
      note: booking.message || "",
    }),
  });
}

export async function sendStatusMail(user, status, reason = "") {
  await sendAccountStatusMail(user, status, reason);
}

export async function sendVerificationMail(user) {
  const frontend = resolveFrontendUrl();
  const verifyLink = `${frontend}/verify?email=${encodeURIComponent(user.email || user.companyEmail)}&otp=${encodeURIComponent(user.verificationOtp)}`;
  await sendMail({
    to: user.email || user.companyEmail,
    subject: "Verify your Rozgar Mitra account",
    html: renderEmailTemplate({
      title: "Action Required",
      headline: "Verify your Rozgar Mitra account",
      body: "Thanks for joining Rozgar Mitra. Use the verification code below or click the button to confirm your email address.",
      buttonText: "Verify my account",
      buttonLink: verifyLink,
      note: "You can sign in immediately after your email is verified.",
      details: [["Verification code", user.verificationOtp], ["Email", user.email || user.companyEmail || "-"]],
    }),
  });
}

export async function sendPasswordResetMail(user) {
  const frontend = resolveFrontendUrl();
  const resetLink = `${frontend}/forgot-password?email=${encodeURIComponent(user.email || user.companyEmail)}&otp=${encodeURIComponent(user.passwordResetOtp)}`;
  await sendMail({
    to: user.email || user.companyEmail,
    subject: "Reset your Rozgar Mitra password",
    html: renderEmailTemplate({
      title: "Password Reset",
      headline: "Reset your Rozgar Mitra password",
      body: "We received a request to reset your password. Use the code below or continue with the button.",
      buttonText: "Reset password",
      buttonLink: resetLink,
      note: "If you did not request this, you can safely ignore this email.",
      details: [["Reset code", user.passwordResetOtp], ["Email", user.email || user.companyEmail || "-"]],
    }),
  });
}

export async function sendAdminCredentialsMail({ user, password }) {
  const frontend = resolveFrontendUrl();
  await sendMail({
    to: user.email,
    subject: "Your Rozgar Mitra Admin Account is Ready",
    html: renderEmailTemplate({
      title: "Admin Account Created",
      headline: "Welcome to Rozgar Mitra admin panel",
      body: "An admin account has been created for you. Use the credentials below to sign in and manage the platform.",
      buttonText: "Login to Admin Panel",
      buttonLink: `${frontend}/login`,
      note: "Please change this password after your first login.",
      details: [["Email", user.email], ["Password", password]],
    }),
  });
}
