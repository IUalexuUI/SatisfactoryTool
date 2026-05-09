import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves the site at https://<user>.github.io/SatisfactoryTool/,
// so production assets must be prefixed with the repo path. Dev server
// keeps using "/" so `npm run dev` works at http://localhost:5173/.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? "/SatisfactoryTool/" : "/",
}));
