import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载本地 .env 文件
  const cwd = (process as any).cwd ? (process as any).cwd() : '.';
  const env = loadEnv(mode, cwd, '');
  const apiKey = process.env.API_KEY || env.API_KEY || '';

  return {
    // 强制使用相对路径 './'，这是解决 GitHub Pages 白屏/404 最稳妥的方法
    base: './', 
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey)
    },
    server: {
      host: true,
      port: 3000,
      open: true
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  };
});