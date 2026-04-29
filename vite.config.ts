import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/mapphoto/",
  plugins: [react()],
  build: {
    target: "es2020",
  },
});
