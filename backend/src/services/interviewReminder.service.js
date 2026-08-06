import { Application } from "../models/Application.js";
import { createNotification } from "./notification.service.js";
import { renderEmailTemplate } from "./mail.service.js";

const ONE_HOUR_MS = 60 * 60 * 1000;
let running = false;

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseInterviewDateTime(interview = {}) {
  if (!interview.date || !interview.time) return null;
  const value = new Date(`${interview.date}T${interview.time}:00+05:30`);
  return Number.isNaN(value.valueOf()) ? null : value;
}

function modeLabel(interview = {}) {
  return interview.mode === "remote" ? "Online / remote" : "Physical / in-person";
}

function interviewAccess(interview = {}) {
  if (interview.mode === "remote") return interview.meetingUrl || "-";
  return interview.locationAddress || "-";
}

function reminderEmailHtml({ title, headline, body, app }) {
  const interview = app.interview || {};
  return renderEmailTemplate({
    title,
    headline,
    body,
    details: [
      ["Candidate", app.candidate?.fullName || "-"],
      ["Company", app.job?.companyName || app.employer?.companyName || "-"],
      ["Job", app.job?.title || "-"],
      ["Date", interview.date || "-"],
      ["Time", interview.time || "-"],
      ["Mode", modeLabel(interview)],
      ["HR / Interviewer", interview.hrName || "-"],
      ["Interview access", interview.mode === "remote" && interview.meetingUrl ? `<a href="${escapeHtml(interview.meetingUrl)}">${escapeHtml(interview.meetingUrl)}</a>` : escapeHtml(interviewAccess(interview))],
      ["Support contact", interview.supportContact || "-"],
    ],
    rawBody: true,
    note: interview.mode === "remote"
      ? "Please join from a quiet place with stable internet and keep your documents ready."
      : "Please reach the venue at least 30 minutes before the scheduled time and carry your government ID.",
    buttonText: "Open Rozgar Mitra",
  });
}

async function sendReminder(app) {
  const interview = app.interview || {};
  const companyName = app.job?.companyName || app.employer?.companyName || "Company";
  const commonBody = `${app.job?.title || "Interview"} at ${companyName} starts in 1 hour. Please be ready.`;

  const notifications = [];
  if (app.candidate?._id) {
    notifications.push(createNotification({
      recipient: app.candidate?._id,
      title: "Interview starts in 1 hour",
      body: commonBody,
      metadata: { type: "interview_reminder", applicationId: String(app._id), jobId: String(app.job?._id || ""), interview },
      sendEmail: true,
      sendPush: true,
      emailSubject: `Interview reminder - ${app.job?.title || "Rozgar Mitra"}`,
      emailHtml: reminderEmailHtml({
        title: "Interview Reminder",
        headline: "Your interview starts in 1 hour",
        body: "This is a reminder for your planned interview window. Please follow the instructions below.",
        app,
      }),
    }));
  }
  if (app.employer?._id) {
    notifications.push(createNotification({
      recipient: app.employer?._id,
      title: "Interview starts in 1 hour",
      body: `${app.candidate?.fullName || "Candidate"} has an interview for ${app.job?.title || "your job"} in 1 hour.`,
      metadata: { type: "interview_reminder_employer", applicationId: String(app._id), jobId: String(app.job?._id || ""), interview },
      sendEmail: true,
      sendPush: true,
      emailSubject: `Interview reminder - ${app.candidate?.fullName || "Candidate"}`,
      emailHtml: reminderEmailHtml({
        title: "Interview Reminder",
        headline: "Candidate interview starts in 1 hour",
        body: `Reminder for ${escapeHtml(app.candidate?.fullName || "the candidate")}. Please keep the HR/interviewer ready.`,
        app,
      }),
    }));
  }
  await Promise.all(notifications);

  app.interviewReminderSentAt = new Date();
  await app.save();
}

export async function runInterviewReminderSweep() {
  if (running) return;
  running = true;
  try {
    const apps = await Application.find({
      status: "interview",
      interviewReminderSentAt: { $exists: false },
      "interview.date": { $exists: true, $ne: "" },
      "interview.time": { $exists: true, $ne: "" },
    })
      .populate({ path: "candidate", select: "fullName email pushTokens" })
      .populate({ path: "employer", select: "companyName fullName email companyEmail pushTokens" })
      .populate({ path: "job", select: "title companyName" })
      .limit(100);

    const now = Date.now();
    for (const app of apps) {
      const interviewAt = parseInterviewDateTime(app.interview);
      if (!interviewAt) continue;
      const diff = interviewAt.getTime() - now;
      if (diff >= 0 && diff <= ONE_HOUR_MS) {
        await sendReminder(app);
      }
    }
  } catch (error) {
    console.error("Interview reminder sweep failed", error);
  } finally {
    running = false;
  }
}

export function startInterviewReminderScheduler(intervalMs = Number(process.env.INTERVIEW_REMINDER_INTERVAL_MS || 60000)) {
  setTimeout(() => runInterviewReminderSweep(), 5000).unref();
  const timer = setInterval(runInterviewReminderSweep, intervalMs);
  timer.unref();
  return timer;
}
