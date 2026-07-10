/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Design tokens produced for the marketing route group (Task 1). Safelisted
  // so they compile before any consuming page references them.
  safelist: [
    'bg-brand',
    'bg-accent',
    'bg-accent-hover',
    'text-brand',
    'bg-neutral-50',
    'border-neutral-400',
    'rounded-brand',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        brand: {
          DEFAULT: '#163300', // Figma: Background Colors/Brand
        },
        accent: {
          DEFAULT: '#9fe870', // Figma: Brand Colors/Secondary
          hover: '#bcef9b', // Figma: Background Colors/Hover
        },
        neutral: {
          50: '#F9FAFB', // Figma: Neutral/50
          400: '#d9dbe9', // Figma: Colors/Neutrals/Neutral 400
        },
      },
      borderRadius: {
        brand: '6px', // Figma: radius/default
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
