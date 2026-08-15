import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const proxyUnavailableBody = JSON.stringify({
  success: false,
  code: "SERVICE_UNAVAILABLE",
  message: "Service temporarily unavailable. Please try again in a moment.",
});

function replyServiceUnavailable(res) {
  if (!res || typeof res.writeHead !== "function" || typeof res.end !== "function" || res.headersSent || res.writableEnded) return;
  res.writeHead(503, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(proxyUnavailableBody);
}

function configureQuietProxy(proxy) {
  proxy.on("error", (_error, _req, res) => {
    replyServiceUnavailable(res);
  });
}

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBase = env.VITE_API_BASE_URL || "https://rozgar-mitra-india.onrender.com/api";
  let proxyTarget = env.VITE_DEV_API_PROXY_TARGET || "http://127.0.0.1:3000";

  if (apiBase.startsWith("http://") || apiBase.startsWith("https://")) {
    try {
      const url = new URL(apiBase);
      proxyTarget = `${url.protocol}//${url.host}`;
    } catch {
      proxyTarget = env.VITE_DEV_API_PROXY_TARGET || "http://127.0.0.1:3000";
    }
  }

  return defineConfig({
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          timeout: 120000,
          proxyTimeout: 120000,
          configure: configureQuietProxy,
        },
        "/socket.io": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
          timeout: 120000,
          proxyTimeout: 120000,
          configure: configureQuietProxy,
        },
      },
    },
  });
};
