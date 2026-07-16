import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Vite configuration for the React implementation of Iconify Navigator. */
export default defineConfig({
  plugins: [react()],
  server: {
    /** Run on a distinct port so Angular (4200) and React (4300) can be served simultaneously. */
    port: 4300
  }
});
