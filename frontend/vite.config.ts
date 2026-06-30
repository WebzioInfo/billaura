import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss() as any],
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
      "@billaura/shared-api": new URL("../../packages/shared-api/src", import.meta.url).pathname,
      "@billaura/shared-types": new URL("../../packages/shared-types/src", import.meta.url).pathname,
      "@billaura/shared-utils": new URL("../../packages/shared-utils/src", import.meta.url).pathname,
      "@billaura/shared-validation": new URL("../../packages/shared-validation/src", import.meta.url).pathname,
      "@billaura/ui": new URL("../../packages/ui/src", import.meta.url).pathname
    }
  },
  server: {
    port: 5173,
    strictPort: false
  }
});
