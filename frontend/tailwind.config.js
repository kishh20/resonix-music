/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        aurora: {
          dark: '#0a0a0f',
          card: '#13131c',
          cardHover: '#1c1c2b',
          surface: '#181824',
          accent: '#10b981',       // Spotify / Aurora emerald green
          accentHover: '#059669',
          purple: '#8b5cf6',
          pink: '#ec4899',
          cyan: '#06b6d4',
          subtext: '#94a3b8',
          border: '#27273a'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
