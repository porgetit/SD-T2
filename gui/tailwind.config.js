/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'chat-yellow':  '#FFFC00',
        'chat-border':  '#E8E8E8',
        'chat-surface': '#F5F5F5',
        'chat-muted':   '#8E8E8E',
        'chat-hint':    '#AAAAAA',
        'avatar-blue':   '#D0E8FF',
        'avatar-green':  '#C8F0D8',
        'avatar-coral':  '#FFD8CC',
        'avatar-purple': '#E0D0FF',
        'avatar-yellow': '#FFF3CC',
        'avatar-pink':   '#FFDCE8',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        'bubble': '18px',
      },
    },
  },
  plugins: [],
}
