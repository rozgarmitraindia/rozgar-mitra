const production = process.env.NODE_ENV === "production";

function missing(names) {
  return names.filter((name) => !String(process.env[name] || "").trim());
}

function assertStrongSecret(name) {
  const value = String(process.env[name] || "");
  if (production && value.length < 32) throw new Error(`${name} must be at least 32 characters in production.`);
}

export function validateEnvironment() {
  const required = ["MONGODB_URI", "JWT_SECRET", "FRONTEND_URL"];
  const absent = missing(required);
  if (absent.length) throw new Error(`Missing required environment variables: ${absent.join(", ")}`);
  assertStrongSecret("JWT_SECRET");
  if (process.env.JWT_REFRESH_SECRET) assertStrongSecret("JWT_REFRESH_SECRET");
  if (production) {
    const origins = process.env.FRONTEND_URL.split(",").map((value) => value.trim());
    const insecurePublicOrigin = origins.find((origin) => {
      try {
        const url = new URL(origin);
        return url.protocol !== "https:" && !["localhost", "127.0.0.1", "::1"].includes(url.hostname);
      } catch {
        return true;
      }
    });
    if (insecurePublicOrigin) throw new Error("Public FRONTEND_URL origins must use HTTPS in production (HTTP is only allowed for localhost development).");
    if (process.env.RESEND_API_KEY && !process.env.MAIL_FROM) throw new Error("MAIL_FROM is required when RESEND_API_KEY is configured.");
  }
}

export function isProduction() {
  return production;
}
