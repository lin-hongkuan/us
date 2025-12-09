/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
      colors: {
        her: {
          bg: '#fff1f2', // Rose 50
          accent: '#be123c', // Rose 700
          text: '#881337', // Rose 900
          glass: 'rgba(255, 241, 242, 0.7)',
        },
        him: {
          bg: '#f0f9ff', // Sky 50
          accent: '#0369a1', // Sky 700
          text: '#0c4a6e', // Sky 900
          glass: 'rgba(240, 249, 255, 0.7)',
        },
      }
    },
  },
  plugins: [],
}
