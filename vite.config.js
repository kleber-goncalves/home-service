import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from "@tailwindcss/vite";


// https://vite.dev/config/
export default defineConfig({
    server: {
        host: "0.0.0.0", // não usa loopback
        port: 5173, // porta ALTA (fora de políticas)
        strictPort: true,
        hmr: {
            port: 5173,
            protocol: "ws",
        },
    },
    plugins: [react(), tailwindcss()],
});
