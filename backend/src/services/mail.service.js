import { Resend } from "resend";
import { sendPushNotification } from "./firebase.service.js";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendMail({ to, subject, html }) {
  if (!resend) {
    console.log("MAIL_SKIPPED_NO_RESEND_KEY", { to, subject });
    return;
  }
  await resend.emails.send({
    from: process.env.MAIL_FROM,
    to,
    subject,
    html,
  });
}

function renderEmailTemplate({ title, headline, body, buttonText, buttonLink, note, footer }) {
  return `
    <div style="background:#f8fafc;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td align="center" style="padding:24px 0;background:linear-gradient(90deg,#2563eb 0%,#f97316 100%);">
            <a href="${buttonLink || '#'}" style="text-decoration:none;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:.5px;">Rozgar Mitra</a>
            <div style="font-size:12px;color:rgba(255,255,255,.85);margin-top:4px;">Jobs, Rooms & Growth for India</div>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:20px 16px;">
            <div style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 18px 38px rgba(15,23,42,.14);">
              <div style="padding:28px 30px;">
                <p style="margin:0 0 8px 0;font-size:14px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:1px;">${title || 'Rozgar Mitra Update'}</p>
                <h1 style="margin:0 0 18px 0;font-size:28px;line-height:1.1;color:#0f172a;">${headline || title || 'Notification'}</h1>
                <p style="margin:0 0 24px 0;color:#475569;font-size:16px;line-height:1.7;">${body || ''}</p>
                ${buttonText && buttonLink ? `
                  <div style="margin:24px 0;text-align:center;">
                    <a href="${buttonLink}" style="background:#25d366;color:#ffffff;padding:14px 24px;border-radius:999px;text-decoration:none;display:inline-block;font-size:16px;font-weight:700;box-shadow:0 12px 24px rgba(37,211,102,.24);">${buttonText}</a>
                  </div>
                ` : ''}
                ${note ? `<div style="margin:16px 0;padding:18px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;color:#475569;font-size:14px;line-height:1.7;">${note}</div>` : ''}
                ${footer ? `<p style="margin:18px 0 0 0;color:#64748b;font-size:13px;line-height:1.7;">${footer}</p>` : ''}
              </div>
              <div style="background:#f8fafc;padding:20px 30px;border-top:1px solid #e2e8f0;color:#64748b;font-size:13px;text-align:center;">
                <div>Visit us at <a href="${buttonLink || '#'}" style="color:#2563eb;text-decoration:none;">${buttonLink || 'Rozgar Mitra'}</a></div>
                <div>© ${new Date().getFullYear()} Rozgar Mitra. All rights reserved.</div>
              </div>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;
}

function resolveFrontendUrl() {
  return (process.env.FRONTEND_URL || "http://localhost:5173").split(",")[0].replace(/\/$/, "");
}

export async function sendAccountStatusMail(user, status, reason = "") {
  const frontend = resolveFrontendUrl();
  const headline = `Your Rozgar Mitra account is ${status}`;
  const buttonLink = `${frontend}/login`;
  const body = status === "verified"
    ? `Your account has been approved and you can now login to Rozgar Mitra.`
    : status === "suspended"
      ? `Your account has been suspended. ${reason || "Please contact support for more information."}`
      : `Your account status has changed to ${status}. ${reason || "Please contact support if you have questions."}`;

  await sendMail({
    to: user.email || user.companyEmail,
    subject: `Rozgar Mitra account ${status}`,
    html: renderEmailTemplate({ title: "Account Update", headline, body, buttonText: "Go to Rozgar Mitra", buttonLink, note: reason }),
  });
}

export async function sendJobStatusMail(user, job, status, reason = "") {
  const frontend = resolveFrontendUrl();
  const headline = `Your job has been ${status}`;
  await sendMail({
    to: user.email || user.companyEmail,
    subject: `Rozgar Mitra job ${status}`,
    html: renderEmailTemplate({
      title: "Job Update",
      headline,
      body: `The job ${job.title || job.role || "your job"} has been ${status}. ${reason}`,
      buttonText: "View job",
      buttonLink: `${frontend}/jobs/${job._id}`,
    }),
  });
}

export async function sendRoomStatusMail(user, room, status, reason = "") {
  const frontend = resolveFrontendUrl();
  const headline = `Your room has been ${status}`;
  await sendMail({
    to: user.email || user.companyEmail,
    subject: `Rozgar Mitra room ${status}`,
    html: renderEmailTemplate({
      title: "Room Update",
      headline,
      body: `The room ${room.title || room.propertyName || "your room"} has been ${status}. ${reason}`,
      buttonText: "View room",
      buttonLink: `${frontend}/rooms/${room._id}`,
    }),
  });
}

export async function sendInterviewScheduledMail(candidate, application) {
  const frontend = resolveFrontendUrl();
  const job = application.job || {};
  const headline = `Interview scheduled for ${job.title || "your application"}`;
  await sendMail({
    to: candidate.email,
    subject: `Interview scheduled - ${job.title || "Rozgar Mitra"}`,
    html: renderEmailTemplate({
      title: "Interview Scheduled",
      headline,
      body: `Your interview has been scheduled by the employer. Please check the details and join on time.`,
      buttonText: "View application",
      buttonLink: `${frontend}/applied-jobs`,
      note: `Interview details: ${JSON.stringify(application.interview || {}, null, 2)}`,
    }),
  });
}

export async function sendApplicationDecisionMail(candidate, application, decision, reason = "") {
  const frontend = resolveFrontendUrl();
  const job = application.job || {};
  const headline = decision === "hired" ? `Congratulations! You've been selected` : `Application update for ${job.title || "your application"}`;
  const body = decision === "hired"
    ? `Great news! You have been selected for ${job.title}. ${reason}`
    : `Your application for ${job.title} has been updated to ${decision}. ${reason}`;

  await sendMail({
    to: candidate.email,
    subject: `Application ${decision} - ${job.title || "Rozgar Mitra"}`,
    html: renderEmailTemplate({
      title: "Application Update",
      headline,
      body,
      buttonText: "View application",
      buttonLink: `${frontend}/applied-jobs`,
      note: reason,
    }),
  });
}

export async function sendVisitRequestMail(owner, room, request) {
  const frontend = resolveFrontendUrl();
  const headline = `New visit request for ${room.title || room.propertyName}`;
  await sendMail({
    to: owner.email,
    subject: `New visit request`,
    html: renderEmailTemplate({
      title: "Visit Request",
      headline,
      body: `A candidate has requested a visit for your listing. Please review the request and respond promptly.`,
      buttonText: "View requests",
      buttonLink: `${frontend}/room-owner/visit-requests`,
      note: JSON.stringify(request || {}, null, 2),
    }),
  });
}

export async function sendBookingStatusMail(candidate, booking, status) {
  const frontend = resolveFrontendUrl();
  const headline = `Booking ${status}`;
  await sendMail({
    to: candidate.email,
    subject: `Booking ${status}`,
    html: renderEmailTemplate({
      title: "Booking Update",
      headline,
      body: `Your booking for ${booking.room?.title || booking.room?.propertyName || "the room"} has been ${status}.`,
      buttonText: "View booking",
      buttonLink: `${frontend}/room-owner/bookings`,
      note: booking.message || "",
    }),
  });
}

export async function sendStatusMail(user, status, reason = "") {
  const frontend = resolveFrontendUrl();
  const title = `Rozgar Mitra account ${status}`;
  const body = reason || "Your account status has been updated by admin.";
  await sendMail({
    to: user.email || user.companyEmail,
    subject: title,
    html: renderEmailTemplate({
      title: "Account Update",
      headline: `Your account is now ${status}`,
      body,
      buttonText: "Login to Rozgar Mitra",
      buttonLink: `${frontend}/login`,
      note: reason,
    }),
  });

  if (user.pushTokens && user.pushTokens.length) {
    await sendPushNotification(user.pushTokens, {
      notification: {
        title,
        body,
      },
      data: { type: "account_status", status },
    });
  }
}

export async function sendVerificationMail(user) {
  const frontend = resolveFrontendUrl();
  const verifyLink = `${frontend}/verify?email=${encodeURIComponent(user.email || user.companyEmail)}&otp=${encodeURIComponent(user.verificationOtp)}`;
  const html = `
    <div style="background:#f8fafc;color:#0f172a;font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td align="center" style="padding:24px 0; background: linear-gradient(90deg, #2563eb 0%, #f97316 100%);">
            <a href="${frontend}" style="text-decoration:none; color:#ffffff; font-size:24px; font-weight:700; letter-spacing:0.5px;">Rozgar Mitra</a>
            <div style="font-size:12px; color:rgba(255,255,255,0.85); margin-top:4px;">Jobs, Rooms & Growth for India</div>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:20px 16px;">
            <div style="max-width:600px; width:100%; background:#ffffff; border-radius:18px; overflow:hidden; box-shadow:0 18px 38px rgba(15,23,42,0.14);">
              <div style="padding:28px 30px;">
                <p style="margin:0 0 8px 0; font-size:14px; font-weight:700; color:#10b981; text-transform:uppercase; letter-spacing:1px;">Action required</p>
                <h1 style="margin:0 0 18px 0; font-size:28px; line-height:1.1; color:#0f172a;">Verify your Rozgar Mitra account</h1>
                <p style="margin:0 0 24px 0; color:#475569; font-size:16px; line-height:1.7;">Thanks for joining Rozgar Mitra. Click the button below to confirm your email address and activate your account instantly.</p>
                <div style="margin:24px 0; text-align:center;">
                  <a href="${verifyLink}" style="background:#25D366; color:#ffffff; padding:14px 24px; border-radius:999px; text-decoration:none; display:inline-block; font-size:16px; font-weight:700; box-shadow:0 12px 24px rgba(37,211,102,0.24);">Verify my account</a>
                </div>
                <div style="margin:16px 0; padding:18px; border-radius:14px; background:#f8fafc; border:1px solid #e2e8f0;">
                  <p style="margin:0 0 6px 0; font-size:14px; color:#334155;">Verification code</p>
                  <p style="margin:0; font-size:20px; letter-spacing:2px; font-weight:700; color:#0f172a;">${user.verificationOtp}</p>
                </div>
                <p style="margin:0; color:#64748b; font-size:14px; line-height:1.7;">If the button doesn't work, copy and paste the following link into your browser:</p>
                <p style="margin:12px 0 0 0; font-size:13px; color:#0f172a; word-break:break-all;"><a href="${verifyLink}" style="color:#2563eb; text-decoration:none;">${verifyLink}</a></p>
                <div style="margin-top:26px; padding:18px 20px; border-radius:14px; background:#f1f5f9; color:#475569; font-size:13px; line-height:1.6;">
                  <strong>Note:</strong> You can also sign in once your email is verified and admin approval is complete.
                </div>
              </div>
              <div style="background:#f8fafc; padding:20px 30px; border-top:1px solid #e2e8f0; color:#64748b; font-size:13px; text-align:center;">
                <div style="margin-bottom:8px;">Visit us at <a href="${frontend}" style="color:#2563eb; text-decoration:none;">${frontend}</a></div>
                <div>© ${new Date().getFullYear()} Rozgar Mitra. All rights reserved.</div>
              </div>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;

  await sendMail({
    to: user.email || user.companyEmail,
    subject: "Verify your Rozgar Mitra account",
    html,
  });
}

export async function sendPasswordResetMail(user) {
  const frontend = (process.env.FRONTEND_URL || "http://localhost:5173").split(",")[0].replace(/\/$/, "");
  const resetLink = `${frontend}/forgot-password?email=${encodeURIComponent(user.email || user.companyEmail)}&otp=${encodeURIComponent(user.passwordResetOtp)}`;
  const html = `
    <div style="background:#f8fafc;color:#0f172a;font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td align="center" style="padding:24px 0; background: linear-gradient(90deg, #2563eb 0%, #f97316 100%);">
            <a href="${frontend}" style="text-decoration:none; color:#ffffff; font-size:24px; font-weight:700; letter-spacing:0.5px;">Rozgar Mitra</a>
            <div style="font-size:12px; color:rgba(255,255,255,0.85); margin-top:4px;">Secure account access for your job and room listings</div>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:20px 16px;">
            <div style="max-width:600px; width:100%; background:#ffffff; border-radius:18px; overflow:hidden; box-shadow:0 18px 38px rgba(15,23,42,0.14);">
              <div style="padding:28px 30px;">
                <p style="margin:0 0 8px 0; font-size:14px; font-weight:700; color:#f97316; text-transform:uppercase; letter-spacing:1px;">Password reset</p>
                <h1 style="margin:0 0 18px 0; font-size:28px; line-height:1.1; color:#0f172a;">Reset your Rozgar Mitra password</h1>
                <p style="margin:0 0 24px 0; color:#475569; font-size:16px; line-height:1.7;">We received a request to reset your password. Use the button below to continue securely.</p>
                <div style="margin:24px 0; text-align:center;">
                  <a href="${resetLink}" style="background:#2563eb; color:#ffffff; padding:14px 24px; border-radius:999px; text-decoration:none; display:inline-block; font-size:16px; font-weight:700; box-shadow:0 12px 24px rgba(37,99,235,0.24);">Reset Password</a>
                </div>
                <div style="margin:16px 0; padding:18px; border-radius:14px; background:#f8fafc; border:1px solid #e2e8f0;">
                  <p style="margin:0 0 6px 0; font-size:14px; color:#334155;">Your reset code</p>
                  <p style="margin:0; font-size:20px; letter-spacing:2px; font-weight:700; color:#0f172a;">${user.passwordResetOtp}</p>
                </div>
                <p style="margin:0; color:#64748b; font-size:14px; line-height:1.7;">If you didn’t request this, you can ignore the email. Your password will stay the same.</p>
                <p style="margin:18px 0 0 0; font-size:13px; color:#0f172a; word-break:break-all;"><a href="${resetLink}" style="color:#2563eb; text-decoration:none;">${resetLink}</a></p>
              </div>
              <div style="background:#f8fafc; padding:20px 30px; border-top:1px solid #e2e8f0; color:#64748b; font-size:13px; text-align:center;">
                <div style="margin-bottom:8px;">Need help? Visit <a href="${frontend}" style="color:#2563eb; text-decoration:none;">${frontend}</a></div>
                <div>© ${new Date().getFullYear()} Rozgar Mitra. All rights reserved.</div>
              </div>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;

  await sendMail({
    to: user.email || user.companyEmail,
    subject: "Reset your Rozgar Mitra password",
    html,
  });
}

export async function sendAdminCredentialsMail({ user, password }) {
  const frontend = (process.env.FRONTEND_URL || "http://localhost:5173").split(",")[0].replace(/\/$/, "");
  const loginLink = `${frontend}/login`;
  const html = `
    <div style="background:#f8fafc;color:#0f172a;font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td align="center" style="padding:24px 0; background: linear-gradient(90deg, #2563eb 0%, #f97316 100%);">
            <a href="${frontend}" style="text-decoration:none; color:#ffffff; font-size:24px; font-weight:700; letter-spacing:0.5px;">Rozgar Mitra</a>
            <div style="font-size:12px; color:rgba(255,255,255,0.85); margin-top:4px;">Your administrator access is ready</div>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:20px 16px;">
            <div style="max-width:600px; width:100%; background:#ffffff; border-radius:18px; overflow:hidden; box-shadow:0 18px 38px rgba(15,23,42,0.14);">
              <div style="padding:28px 30px;">
                <p style="margin:0 0 8px 0; font-size:14px; font-weight:700; color:#10b981; text-transform:uppercase; letter-spacing:1px;">Admin account created</p>
                <h1 style="margin:0 0 18px 0; font-size:28px; line-height:1.1; color:#0f172a;">Welcome to Rozgar Mitra admin panel</h1>
                <p style="margin:0 0 24px 0; color:#475569; font-size:16px; line-height:1.7;">An admin account has been created for you. Use the credentials below to sign in and manage the platform.</p>
                <div style="margin:24px 0; padding:22px; border-radius:18px; background:#f8fafc; border:1px solid #e2e8f0;">
                  <p style="margin:0 0 8px 0; font-size:14px; color:#334155;">Email</p>
                  <p style="margin:0 0 18px 0; font-size:16px; font-weight:700; color:#0f172a;">${user.email}</p>
                  <p style="margin:0 0 8px 0; font-size:14px; color:#334155;">Password</p>
                  <p style="margin:0; font-size:16px; font-weight:700; color:#0f172a;">${password}</p>
                </div>
                <div style="margin:24px 0; text-align:center;">
                  <a href="${loginLink}" style="background:#2563eb; color:#ffffff; padding:14px 24px; border-radius:999px; text-decoration:none; display:inline-block; font-size:16px; font-weight:700; box-shadow:0 12px 24px rgba(37,99,235,0.24);">Login to Admin Panel</a>
                </div>
                <p style="margin:0; color:#64748b; font-size:14px; line-height:1.7;">If you didn’t expect this email, please contact the Rozgar Mitra team immediately.</p>
              </div>
              <div style="background:#f8fafc; padding:20px 30px; border-top:1px solid #e2e8f0; color:#64748b; font-size:13px; text-align:center;">
                <div style="margin-bottom:8px;">Visit your app: <a href="${frontend}" style="color:#2563eb; text-decoration:none;">${frontend}</a></div>
                <div>© ${new Date().getFullYear()} Rozgar Mitra. All rights reserved.</div>
              </div>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;

  await sendMail({
    to: user.email,
    subject: "Your Rozgar Mitra Admin Account is Ready",
    html,
  });
}
