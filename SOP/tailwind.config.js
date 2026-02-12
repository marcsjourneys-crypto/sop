/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'esi-blue': '#2e4a8e',
        'esi-blue-dark': '#1e3a7e',
      }
    },
  },
  plugins: [],
}
