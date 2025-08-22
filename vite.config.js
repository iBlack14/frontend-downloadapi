import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Descargador de Videos",
        short_name: "Downloader",
        description: "Descarga videos de tus plataformas favoritas",
        theme_color: "#7c3aed",
        background_color: "#ffffff",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/favicon-32x32.png",
            sizes: "32x32",
            type: "image/png",
          },
          {
            src: "/favicon-16x16.png",
            sizes: "16x16",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  base: "./", // 👈 Clave para que no se rompa en producción
  build: {
    outDir: "dist", // carpeta que usará Vercel
    sourcemap: true, // opcional: ayuda a depurar errores en producción
  },
  server: {
    port: 5173,
    open: true,
  },
});

