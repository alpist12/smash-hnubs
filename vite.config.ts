import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * rapier3d-compat은 물리 엔진 WASM(1.5MB)을 base64로 JS 안에 넣어 둔다(2.1MB, 파싱도 느림).
 * 그 문자열을 걷어내고 같은 패키지의 .wasm 파일을 따로 받아 스트리밍 컴파일하게 한다.
 */
function rapierWasm(): Plugin {
  return {
    name: 'rapier-external-wasm',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').endsWith('@dimforge/rapier3d-compat/rapier.mjs')) return;
      const next = code.replace(/\(\w+\.toByteArray\("[A-Za-z0-9+/=]+"\)\.buffer\)/, '({module_or_path:__rapierWasm})');
      if (next === code) throw new Error('rapier-external-wasm: inline wasm pattern not found, check the rapier version');
      return `import __rapierWasm from './rapier_wasm3d_bg.wasm?url';\n${next}`;
    },
  };
}

export default defineConfig({
  plugins: [rapierWasm(), react()], base: './', server: { port: 5173, strictPort: true },
  // 사전 번들(esbuild)은 플러그인 변환을 거치지 않으므로 rapier는 제외한다.
  optimizeDeps: { exclude: ['@dimforge/rapier3d-compat'] },
  build: { chunkSizeWarningLimit: 1800, rollupOptions: { input: { main: 'index.html', edit: 'edit/index.html' } } },
});
