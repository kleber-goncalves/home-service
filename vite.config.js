import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const sourceDirectory = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
    resolve: { alias: { "@": sourceDirectory } },
    server: { host: "0.0.0.0", port: 5173, strictPort: true },
    plugins: [react(), tailwindcss()],
});
