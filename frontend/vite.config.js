import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import net from "node:net";

const proxyUnavailableBody = JSON.stringify({
  success: false,
  code: "SERVICE_UNAVAILABLE",
  message: "Service temporarily unavailable. Please try again in a moment.",
});

function replyServiceUnavailable(res) {
  if (!res || typeof res.writeHead !== "function" || typeof res.end !== "function" || res.headersSent || res.writableEnded) return;
  res.writeHead(200, {
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

function createBackendAvailabilityChecker(proxyTarget) {
  const url = new URL(proxyTarget);
  let cached = { checkedAt: 0, available: true };
  return function isAvailable() {
    const now = Date.now();
    if (now - cached.checkedAt < 1500) return Promise.resolve(cached.available);
    return new Promise((resolve) => {
      const socket = net.connect(Number(url.port || (url.protocol === "https:" ? 443 : 80)), url.hostname);
      let done = false;
      function finish(available) {
        if (done) return;
        done = true;
        cached = { checkedAt: Date.now(), available };
        socket.destroy();
        resolve(available);
      }
      socket.setTimeout(350);
      socket.once("connect", () => finish(true));
      socket.once("timeout", () => finish(false));
      socket.once("error", () => finish(false));
    });
  };
}

function quietBackendUnavailablePlugin(proxyTarget) {
  const isAvailable = createBackendAvailabilityChecker(proxyTarget);
  return {
    name: "quiet-backend-unavailable",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();
        if (await isAvailable()) return next();
        replyServiceUnavailable(res);
      });
    },
  };
}

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBase = env.VITE_API_BASE_URL || "/api";
  let proxyTarget = "http://127.0.0.1:3000";

  if (apiBase.startsWith("http://") || apiBase.startsWith("https://")) {
    try {
      const url = new URL(apiBase);
      proxyTarget = `${url.protocol}//${url.host}`;
    } catch {
      proxyTarget = "http://127.0.0.1:3000";
    }
  }

  return defineConfig({
    plugins: [quietBackendUnavailablePlugin(proxyTarget), react()],
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
          configure: configureQuietProxy,
        },
      },
    },
  });
};
