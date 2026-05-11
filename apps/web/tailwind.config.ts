import type { Config } from 'tailwindcss';

// VI: Cau hinh Tailwind voi mau do/den dung nhu diem nhan thuong hieu.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#c1121f',
          black: '#171717',
          gray: '#f5f5f5',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
