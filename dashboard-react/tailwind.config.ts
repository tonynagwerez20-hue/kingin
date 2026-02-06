import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#000000", // Pitch Black
                surface: "#0a0a0a",    // Dark Neutral
                border: "#1a1a1a",     // Subtle divider
                primary: "#ffffff",    // White (Clean contrast)
                success: "#00ff88",    // Vibrant Green
                danger: "#ff4444",     // Vibrant Red
                warning: "#ffaa00",    // Vibrant Orange
                textPrimary: "#f5f5f5",
                textSecondary: "#a1a1a1",
                textMuted: "#525252",
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
                mono: ["JetBrains Mono", "monospace"],
            },
        },
    },
    plugins: [],
};

export default config;
