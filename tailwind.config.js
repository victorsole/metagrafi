/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        beresol: {
          green: {
            DEFAULT: '#2D5016',
            light: '#4A7C23',
            dark: '#1A3009',
          },
          gold: '#8B7355',
          cream: '#F5F5DC',
          black: '#1A1A1A',
        },
      },
    },
  },
  plugins: [],
}
