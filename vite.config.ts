import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';


export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Add any path aliases you need
      '@': path.resolve(__dirname, './src')
    },
  },
  server: {
    port: 3000, // Match CRA's default port
  },
  define: {
    // Add any global constants
    'process.env': process.env
  }
});