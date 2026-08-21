import type { Config } from 'tailwindcss';

/**
 * Ported verbatim from the Magic Patterns Tailwind config (ADR-001).
 * These tokens are the Stage 1 design contract — do not change values
 * without a corresponding design decision.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F7F3EC',
        surface: '#FFFFFF',
        ink: '#17231D',
        // Magic Patterns had #6B7A72, which reaches only 4.08:1 on canvas and
        // fails WCAG AA for the subtitles, section labels and placeholders it is
        // used for. Darkened 6% — the smallest change that clears 4.5:1 — with
        // hue and saturation preserved.
        muted: '#65736B',
        line: '#E8E2D7',
        moss: {
          50: '#EDF4EF',
          100: '#DCEAE1',
          200: '#B7D3C1',
          300: '#8DBA9E',
          400: '#5C9A75',
          500: '#3B7D57',
          600: '#2E6B4A',
          700: '#25563C',
          800: '#1D4430',
          900: '#153224',
        },
        clay: {
          50: '#FBEFE7',
          100: '#F6DECD',
          400: '#DC8B58',
          500: '#C86A3E',
          600: '#A85430',
        },
        honey: {
          50: '#FCF3DE',
          500: '#C08A16',
          // Was #9C6F10 — 4.05:1 on honey-50, failing AA for the "Low" stock
          // chip and the pantry stat tile. Darkened 6.5% to clear 4.5:1.
          600: '#92680F',
        },
        berry: {
          50: '#FBEAE7',
          500: '#C0473A',
          600: '#9E382D',
        },
      },
      fontFamily: {
        sans: ['var(--font-plus-jakarta)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px',
        '3xl': '26px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(23,35,29,0.04), 0 8px 24px -16px rgba(23,35,29,0.18)',
        lift: '0 8px 30px -12px rgba(23,35,29,0.28)',
        sheet: '0 -12px 40px -18px rgba(23,35,29,0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
