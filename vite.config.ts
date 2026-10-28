import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Local-only prototype. Dev server on 5173 to match the design mockups.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Lock the port so the OAuth redirect URI (http://localhost:5173) always matches.
    strictPort: true,
  },
});
