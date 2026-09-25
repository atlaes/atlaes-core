/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
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
        // Marketing brand tokens (Figma system). Mirrored as CSS variables
        // in app/(marketing)/marketing.css (`--mk-*`).
        brand: {
          navy: '#002691',
          blue: '#5e8cd9',
          pale: '#afc6ec',
          tint: '#d7e4f6',
          surface: '#f1f1f1',
          ink: '#181818',
          body: '#4b4f58',
          muted: '#8c8c8c',
          stroke: '#c6c6c6',
        },
      },
      borderRadius: {
        card: '20px',
      },
      maxWidth: {
        body: '936px',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
