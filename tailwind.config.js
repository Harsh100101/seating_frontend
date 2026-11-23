/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"SF Pro Display"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          DEFAULT: '#e65004',
        },
        obsidian: {
          900: '#070A0F',
          800: '#0B0F17',
          700: '#111827',
          600: '#1F2937',
        },
      },
      boxShadow: {
        'glass': '0 8px 30px -4px rgba(15, 23, 42, 0.08)',
        'glass-hover': '0 14px 34px -4px rgba(15, 23, 42, 0.12)',
        'glow-brand': '0 0 25px -4px rgba(230, 80, 4, 0.35)',
        'glow-emerald': '0 0 25px -4px rgba(16, 185, 129, 0.35)',
      },
    },
  },
  plugins: [],
};
