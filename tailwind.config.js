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
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        // "Modern Texas heritage" palette: warm industrial charcoal, reclaimed
        // wood, bone linen and living green. Used by Grub Roulette so the
        // spinner reads as a Katy farm-town cafe rather than a casino floor.
        charcoal: {
          50: '#f6f4f1',
          100: '#e8e4de',
          200: '#cfc8be',
          300: '#aaa197',
          400: '#7d746a',
          500: '#5b534b',
          600: '#453f38',
          700: '#332e29',
          800: '#26221e',
          900: '#1b1815',
          950: '#12100e',
        },
        honey: {
          50: '#fbf6ec',
          100: '#f5e9d2',
          200: '#e9d3a9',
          300: '#dbb87b',
          400: '#cfa267',
          500: '#bd8747',
          600: '#a06d38',
          700: '#7c5228',
          800: '#5c3c1f',
          900: '#422b16',
        },
        sage: {
          50: '#f2f5ee',
          100: '#e1e8d8',
          200: '#c3d2b3',
          300: '#9db489',
          400: '#7a9566',
          500: '#5e7a4e',
          600: '#4a6340',
          700: '#3e5245',
          800: '#2e3c31',
          900: '#212b22',
        },
        bone: {
          50: '#fdfaf4',
          100: '#f7f1e6',
          200: '#efe4d1',
          300: '#e6d5b6',
          400: '#d8c29a',
        },
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
      },
    },
  },
  plugins: [],
}