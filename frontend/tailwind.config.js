/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f9fbe8',
          100: '#f1f6cd',
          200: '#e5f0a3',
          300: '#ecf39e', // Light Pale Green
          400: '#c5d84c',
          500: '#a2b827',
          600: '#7d911b',
          700: '#5e6e18',
          800: '#4a5717',
          900: '#31572c', // Dark Forest Green
          950: '#1a3116',
        },
        dark: {
          900: '#0d140b', // Deep forest black for backgrounds
          800: '#152113',
          700: '#1e2e1b',
        }
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
