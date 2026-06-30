import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss() as any],
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    }
  },
  server: {
    port: 5173,
    strictPort: false
  }
});
