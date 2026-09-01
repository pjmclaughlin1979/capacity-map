import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// Relative base so the build works unmodified from a GitHub Pages
// project site (username.github.io/repo/) or a user/org site.
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    port: Number(process.env.PORT) || 5174,
    strictPort: false,
  },
  build: {
    target: "esnext",
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        niestyle: fileURLToPath(new URL("./niestyle.html", import.meta.url)),
      },
    },
  },
  worker: {
    format: "es",
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
  },
});
