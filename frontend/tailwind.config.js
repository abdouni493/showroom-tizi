/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        steel: {
          950: "#171A20", 900: "#1F2228", 850: "#21252C", 800: "#24282F", 700: "#2E333A",
          600: "#3A414A", 500: "#3E454E", 400: "#4C545E", 300: "#5D656E", 200: "#78828C", 100: "#9CA8B1",
        },
        crimson: {
          950: "#2E0A08", 900: "#4A100D", 800: "#591816", 700: "#6C2826", 600: "#7F2E2A",
          500: "#9B302B", 400: "#B4413C", 300: "#C56B66", 200: "#D08A85", 100: "#E2B2AE",
        },
        silver: {
          50: "#F5F6F6", 100: "#E5E6E6", 200: "#D3D5D7", 300: "#C0C2C4", 400: "#A9ACB0",
          500: "#99A1A9", 600: "#868F98", 700: "#78818A", 800: "#6B747E", 900: "#5D6670",
        },
        surface: "#1F2228",
        glass: "rgba(46,51,58,0.72)",
        accent: "#9B302B",
        "accent-dark": "#6C2826",
        "text-primary": "#E5E6E6",
        "text-muted": "rgba(153,161,169,0.78)",
        success: "#3FA07C",
        warning: "#C89143",
        info: "#5B87B5",
        supplier: "#8A7BA8",
        debt: "#C56B66",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "1.5rem",
        panel: "2rem",
      },
      keyframes: {
        float1: {
          "0%,100%": { transform: "translate(0,0) scale(1)" },
          "50%": { transform: "translate(40px,-30px) scale(1.1)" },
        },
        float2: {
          "0%,100%": { transform: "translate(0,0) scale(1)" },
          "50%": { transform: "translate(-30px,40px) scale(1.15)" },
        },
        float3: {
          "0%,100%": { transform: "translate(0,0) scale(1)" },
          "50%": { transform: "translate(20px,30px) scale(0.95)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        shine: {
          "0%": { left: "-60%" },
          "100%": { left: "140%" },
        },
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { transform: "translateY(20px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
        scaleIn: { "0%": { transform: "scale(0.92)", opacity: "0" }, "100%": { transform: "scale(1)", opacity: "1" } },
        pulse: { "0%,100%": { opacity: "1" }, "50%": { opacity: ".5" } },
      },
      animation: {
        float1: "float1 8s ease-in-out infinite",
        float2: "float2 12s ease-in-out infinite",
        float3: "float3 10s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite",
        shine: "shine 3s ease-in-out infinite",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.35s ease-out",
        "scale-in": "scaleIn 0.25s ease-out",
        "pulse-slow": "pulse 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
