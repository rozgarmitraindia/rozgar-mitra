import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBase = env.VITE_API_BASE_URL || "/api";
  let proxyTarget = "http://localhost:3000";

  if (apiBase.startsWith("http://") || apiBase.startsWith("https://")) {
    try {
      const url = new URL(apiBase);
      proxyTarget = `${url.protocol}//${url.host}`;
    } catch (error) {
        proxyTarget = "http://localhost:3000";
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
        },
        "/socket.io": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
  });
};
