import { createServer } from 'vite';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { editorMiddleware } from './editor-middleware';
const root = process.cwd();
const run = promisify(execFile);
const rebuild = () => run(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), 'build'], { cwd: root, env: { ...process.env, NODE_ENV: 'production' }, timeout: 120000, maxBuffer: 1024 * 1024 });
const server = await createServer({ root, plugins: [{ name: 'local-author-layout', configureServer(server) {
  // vite가 파일 변경을 감시하므로 ssrLoadModule은 항상 최신 room.ts / layout.ts를 돌려준다.
  server.middlewares.use(editorMiddleware(root, rebuild, async () => ({ ...(await server.ssrLoadModule('/src/data/room.ts')), ...(await server.ssrLoadModule('/src/data/layout.ts')) }) as never));
} }], server: { host: '127.0.0.1', port: 5174, strictPort: true, hmr: false } });
await server.listen();
console.log('\n제작자 전용 배치 편집기: http://127.0.0.1:5174/tools/layout-editor.html\n공개 게임 빌드에는 편집 화면이나 저장 API가 포함되지 않습니다.\n');
