import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'gtm-bg': {
          DEFAULT: '#0a0515',
          secondary: '#14101e',
          elevated: '#1a1528',
        },
        'gtm-magenta': {
          DEFAULT: '#de347f',
          light: '#e958a1',
          dark: '#b82868',
        },
        'gtm-purple': {
          DEFAULT: '#8f76f5',
          light: '#a994ff',
          dark: '#6b52d4',
        },
      },
      boxShadow: {
        'glow-magenta': '0 0 20px -5px rgba(222, 52, 127, 0.4), 0 0 8px -2px rgba(222, 52, 127, 0.3)',
        'glow-purple': '0 0 20px -5px rgba(143, 118, 245, 0.4), 0 0 8px -2px rgba(143, 118, 245, 0.3)',
      },
      backgroundImage: {
        'gtm-gradient': 'linear-gradient(135deg, #de347f, #8f76f5)',
      },
    },
  },
  plugins: [],
};

export default config;
