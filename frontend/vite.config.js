import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// No backend server needed — the app talks to Supabase directly.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
