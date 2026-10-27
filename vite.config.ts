import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Local-only prototype. Dev server on 5173 to match the design mockups.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
  },
});
