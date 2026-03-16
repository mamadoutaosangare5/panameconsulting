import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  define: {
    "import.meta.env.MODE": JSON.stringify(process.env.NODE_ENV),
  },
  css: {
    devSourcemap: false, // Disable sourcemaps in production
    transformer: 'lightningcss', // Faster CSS processing (requires installation)
  },

  build: {
    cssMinify: 'lightningcss', // Faster CSS minification
    sourcemap: false, // Disable sourcemaps in production for faster builds
    chunkSizeWarningLimit: 2500,
    minify: "oxc", // natif Vite 8, pas besoin d'installation
    terserOptions: undefined, // forcer la désactivation
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/react-router-dom/")
          ) {
            return "react-vendor";
          }
          if (
            id.includes("node_modules/lucide-react/") ||
            id.includes("node_modules/react-toastify/")
          ) {
            return "ui-vendor";
          }
          if (id.includes("/pages/gestionnaire/")) {
            return "gestionnaire";
          }
          if (id.includes("/pages/user/")) {
            return "user";
          }
          if (id.includes("/pages/auth/")) {
            return "auth";
          }
          if (id.includes("/pages/(main)/")) {
            return "main";
          }
        },
      },
    },
  },

  server: {
    port: 10000,
    host: true,
    proxy: {
      "/api": { target: "http://localhost:10000", changeOrigin: true },
      "/uploads": { target: "http://localhost:10000", changeOrigin: true },
    },
  },
});
