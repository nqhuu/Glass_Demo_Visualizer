import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// VI: Cau hinh Vite cho ung dung React noi bo, giu don gian de de chay Sprint 0.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
