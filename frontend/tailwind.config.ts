import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        wood: {
          dark: '#2a1810',
          medium: '#4a2c1a',
          light: '#6b4423',
          highlight: '#8b5a2b',
        },
        gold: {
          dark: '#8b6914',
          DEFAULT: '#d4a017',
          light: '#f4c430',
        },
        parchment: {
          DEFAULT: '#e8d5b7',
          dark: '#c4a77d',
        },
        blood: '#8b0000',
        rust: '#b7410e',
      },
      fontFamily: {
        western: ['Rye', 'serif'],
        pirata: ['Pirata One', 'cursive'],
        cinzel: ['Cinzel Decorative', 'serif'],
        fell: ['IM Fell English', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.4s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'flicker': 'flicker 4s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
      boxShadow: {
        'wood': 'inset 0 2px 4px rgba(255,255,255,0.1), inset 0 -2px 4px rgba(0,0,0,0.3), 0 8px 16px rgba(0,0,0,0.5)',
        'gold': '0 0 10px #d4a017, 0 0 20px rgba(212, 160, 23, 0.3)',
      },
    },
  },
  plugins: [],
};

export default config;
