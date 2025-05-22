/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./script.js",
  ],
  theme: {
    extend: {
      colors: {
        'bg-dark': '#1e1e1e',
        'bg-medium': '#2a2a2a',
        'bg-light': '#3a3a3a',
        'text-white': '#ffffff',
        'accent-blue': '#42a5f5',
        'accent-dark-blue': '#007bff',
      },
      fontFamily: {
        sans: ['Arial', 'sans-serif'],
      }
    },
  },
  plugins: [],
}