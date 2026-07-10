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
          50: '#f6f9fc',
          100: '#eef4ed', // Pale Mint / Off-White
          200: '#c5d5e4',
          300: '#8da9c4', // Soft Blue-Gray
          400: '#5a7fa5',
          500: '#345e8b',
          600: '#234771',
          700: '#1a3759',
          800: '#172f4e',
          900: '#13315c', // Deep Navy Blue
          950: '#0c2243',
        },
        light: {
          50: '#ffffff',
          100: '#f8fafc',
          200: '#f1f5f9',
          300: '#e2e8f0',
        }
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
