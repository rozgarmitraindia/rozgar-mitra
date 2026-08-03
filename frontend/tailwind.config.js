/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Noto Sans Devanagari", "ui-sans-serif", "system-ui"],
        display: ["Baloo 2", "Poppins", "Inter", "ui-sans-serif"],
      },
      colors: {
        ink: "#111827",
        navy: "#102A56",
        saffron: "#ff7a1a",
        emerald: "#087f5b",
        mist: "#f7fafc",
      },
      boxShadow: {
        glass: "0 24px 80px rgba(16, 42, 86, 0.14)",
      },
    },
  },
  darkMode: "class",
  plugins: [],
};
