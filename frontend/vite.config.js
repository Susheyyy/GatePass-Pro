import process from 'node:process';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env };
  if (command === 'build' && !env.VITE_API_BASE_URL && !env.VITE_API_URL) throw new Error('Set VITE_API_BASE_URL (for example https://api.your-domain.com/api) before building');
  return { plugins: [react()] };
});
