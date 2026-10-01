const path = require('path');

// The Tailwind config is pinned to this folder so builds started from the
// repo root (e.g. `next build apps/gpr`) still find it; otherwise Tailwind
// falls back to an empty config and emits no utility classes.
module.exports = {
  plugins: {
    tailwindcss: { config: path.join(__dirname, 'tailwind.config.js') },
    autoprefixer: {},
  },
};
