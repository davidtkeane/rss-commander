/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#22d3ee',
          dark: '#0891b2',
          light: '#67e8f9',
          glow: 'rgba(34,211,238,0.15)',
        },
        surface: {
          primary: '#070709',
          secondary: '#0d0d14',
          card: '#111118',
          hover: '#16161f',
          modal: '#0a0a12',
        },
        border: {
          DEFAULT: '#1e1e2e',
          bright: '#2a2a3e',
          focus: '#22d3ee',
        },
        cat: {
          pentesting: '#f59e0b',
          malware: '#ef4444',
          forensics: '#3b82f6',
          news: '#22c55e',
          datagov: '#14b8a6',
          blockchain: '#8b5cf6',
        },
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'sans-serif'],
        ui: ['Rajdhani', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        ticker: 'ticker var(--ticker-duration, 50s) linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-in-right': 'slide-in-right 0.25s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
      keyframes: {
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 4px #22d3ee' },
          '50%': { opacity: '0.5', boxShadow: '0 0 12px #22d3ee' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'cyan-glow': '0 0 20px rgba(34,211,238,0.15)',
        'cyan-glow-lg': '0 0 40px rgba(34,211,238,0.2)',
        card: '0 1px 3px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
};
