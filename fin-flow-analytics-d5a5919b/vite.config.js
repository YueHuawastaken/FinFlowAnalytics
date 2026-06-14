import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE'
    }
    ,
    // If running in a Codespace, set origin and HMR host to the public browse URL
    origin: process.env.CODESPACE_NAME ? `https://${process.env.CODESPACE_NAME}-${process.env.PORT || 5173}.app.github.dev` : undefined,
    hmr: process.env.CODESPACE_NAME ? { host: `${process.env.CODESPACE_NAME}-${process.env.PORT || 5173}.app.github.dev`, protocol: 'wss' } : undefined
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
})
