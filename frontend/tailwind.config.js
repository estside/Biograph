/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        biotech: {
          dark: '#0a0b10',
          card: 'rgba(18, 20, 32, 0.75)',
          border: 'rgba(255, 255, 255, 0.08)',
          accent: '#00f2fe',
          glow: '#4facfe',
          destabilizing: '#ef4444',
          stabilizing: '#10b981',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-accent': '0 0 20px rgba(0, 242, 254, 0.15)',
        'glow-green': '0 0 25px rgba(16, 185, 129, 0.25)',
        'glow-red': '0 0 25px rgba(239, 68, 68, 0.25)',
      }
    },
  },
  plugins: [],
}
