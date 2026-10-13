/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        red: {
          brand: "#E63843",
        },
        ink: "#151515",
        ivory: "#F5F0E8",
        lime: {
          acid: "#D8FF63",
        },
      },
      fontFamily: {
        display: ['"Archivo"', "ui-sans-serif", "system-ui", "sans-serif"],
        body: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      transitionTimingFunction: {
        editorial: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
