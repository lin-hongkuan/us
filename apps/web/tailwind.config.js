import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  content: [
    path.join(__dirname, "./index.html"),
    path.join(__dirname, "./src/**/*.{js,ts,jsx,tsx}"),
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
        display: ['"Skranji"', 'cursive'],
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
