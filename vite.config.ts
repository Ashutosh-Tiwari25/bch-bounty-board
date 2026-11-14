import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// Single self-contained index.html so the spike can be opened by double-clicking it.
export default defineConfig({ plugins: [react(), viteSingleFile()] });
