/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./frontend/**/*.{js,jsx,ts,tsx}", 
    "./index.html", 
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Oxygen",
          "Ubuntu",
          "Cantarell",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        "deep-green": "#064E3B",  
        "dark-green": "#046C4E",  
        "light-green": "#D1FAE5", 
        "light-cream": "#FEF9F4", 
      },
    },
  },
  plugins: [],
  darkMode: "class", 
};

