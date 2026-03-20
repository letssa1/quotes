import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Vite config — registers React JSX transform and Tailwind CSS
export default defineConfig({
    plugins: [
        react(),        // enables JSX + fast refresh
        tailwindcss(),  // processes Tailwind utility classes
    ],
});