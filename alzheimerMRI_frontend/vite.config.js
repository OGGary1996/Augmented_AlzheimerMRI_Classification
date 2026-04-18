import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    envPrefix: ['VITE_', 'REACT_APP_'],
    server: {
      proxy: {
        '/predict': {
          target: env.REACT_APP_API_URL || 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        },
        '/chatbot': {
          target: env.REACT_APP_CHATBOT_API_URL || env.REACT_APP_API_URL || 'http://127.0.0.1:8001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
