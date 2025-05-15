/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        teal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#00A0C1', // ProduckAI teal - updated to match logo
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        purple: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#7650A1', // ProduckAI purple - updated to match logo
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },
      },
      animation: {
        'float': 'float 5s ease-in-out infinite',
        'fadeIn': 'fadeIn 0.5s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0)' },
          '50%': { transform: 'translateY(-20px) rotate(10deg)' },
        },
        fadeIn: {
          'from': { opacity: 0, transform: 'translateY(10px)' },
          'to': { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};