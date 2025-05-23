// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html", // Ensures Tailwind scans your HTML files (like index.html)
    "./*.js",   // Ensures Tailwind scans your JavaScript files for dynamically generated classes (like script.js)
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds (Matching image_7d13be.jpg's deep dark theme)
        'app-bg': '#141414',          // Very dark, almost black background for the entire app
        'header-bg': '#1A1A1A',       // Slightly lighter than app-bg for header (subtle contrast)
        'sidebar-bg': '#1A1A1A',      // Same as header for sidebar background
        'main-content-bg': '#141414', // Same as app-bg for the main content area
        'card-bg': '#2C2C2C',         // Dark gray for forms/query sections (the main content blocks)
        'sidebar-hover': '#2C2C2C',   // Hover state for sidebar links (matches card-bg)
        'sidebar-active': '#3A82F6',  // Active state for sidebar links (solid blue like original)

        // Text Colors
        'text-light': '#E0E0E0',      // Main text color (light gray/off-white)
        'text-placeholder': '#A0AEC0', // Placeholder text color (medium gray)
        'text-dark': '#888888',       // Darker text for less emphasis

        // Input and Border Colors
        'input-bg': '#141414',        // Background for input fields (matches app-bg for deep look)
        'input-border': '#4A4A4A',    // Subtle border for input fields
        'border-default': '#4A4A4A',  // Default border for cards/containers

        // Accent Colors (buttons, active states, validation)
        'accent-blue': '#3A82F6',     // Primary accent blue (for buttons, active highlights)
        'accent-dark-blue': '#2563EB', // Darker blue for hover states
        'error-red': '#EF4444',       // For validation errors

        // Table specific colors
        'table-bg': '#2C2C2C',        // Background for the entire table (matches card-bg)
        'table-header-bg': '#1A1A1A', // Background for table headers (matches sidebar/header)
        'table-row-even': '#2C2C2C',  // Even row background (same as table-bg)
        'table-row-odd': '#1A1A1A',   // Odd row background (for subtle striping)
        'table-row-hover': '#4A4A4A', // Hover state for table rows
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // A modern, clean sans-serif font
        mono: ['Fira Code', 'monospace'], // For code snippets
      },
    },
  },
  plugins: [],
}