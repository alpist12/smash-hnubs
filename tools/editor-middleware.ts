import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import * as roomModule from '../src/data/room';
import * as layoutModule from '../src/data/layout';
import { checkRoomBounds } from './layout-operations';

type RoomData = { DEFAULT_ITEMS: typeof roomModule.DEFAULT_ITEMS; WORLD: typeof roomModule.WORLD; applyLayout: typeof layoutModule.applyLayout };
/** load: 요청마다 최신 가구 데이터를 읽는다(서버를 켠 뒤 코드가 바뀌어도 옛 배치를 보여 주지 않도록). */
export function editorMiddleware(root: string, rebuild: () => Promise<unknown>, load: () => Promise<RoomData> = async () => ({ ...roomModule, ...layoutModule })) {
  let saving = false;
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.url !== '/__layout') { next(); return; }
    res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Cache-Control', 'no-store');
    const reply = (code: number, value: unknown) => { res.statusCode = code; res.end(JSON.stringify(value)); };
    const host = req.headers.host ?? '';
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '') || !/^(127\.0\.0\.1|localhost):\d+$/.test(host)) { reply(403, { error: '이 컴퓨터에서만 사용할 수 있습니다.' }); return; }
    const target = resolve(root, 'src/data/layout.json');
    const { DEFAULT_ITEMS, WORLD, applyLayout } = await load();
    if (req.method === 'GET') {
      try { reply(200, { items: applyLayout(DEFAULT_ITEMS, JSON.parse(await readFile(target, 'utf8'))), room: WORLD }); }
      catch { reply(500, { error: '저장된 배치를 읽지 못했습니다.' }); }
      return;
    }
    if (req.method !== 'POST') { reply(405, { error: '지원하지 않는 요청입니다.' }); return; }
    if (req.headers.origin !== `http://${host}` || !req.headers['content-type']?.startsWith('application/json')) { reply(403, { error: '편집 화면에서 저장해 주세요.' }); return; }
    if (saving) { reply(409, { error: '저장 중입니다. 잠시 기다려 주세요.' }); return; }
    saving = true;
    try {
      let body = '', size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 128 * 1024) throw new Error('배치 파일이 너무 큽니다.'); body += chunk.toString('utf8'); }
      const layout = JSON.parse(body), placed = applyLayout(DEFAULT_ITEMS, layout);
      for (const item of placed) if (!item.fixed) checkRoomBounds(item);
      const old = await readFile(target, 'utf8');
      const backup = resolve(root, 'work/layout-backups'); await mkdir(backup, { recursive: true }); await writeFile(resolve(backup, `layout-${Date.now()}.json`), old);
      await writeFile(`${target}.tmp`, JSON.stringify(layout, null, 2) + '\n'); await rename(`${target}.tmp`, target);
      try { await rebuild(); }
      catch { reply(500, { error: '배치는 저장했으나 게임 빌드가 실패했습니다. 터미널의 오류를 확인해 주세요.' }); return; }
      reply(200, { ok: true });
    } catch (error) { reply(400, { error: error instanceof Error ? error.message : '저장하지 못했습니다.' }); }
    finally { saving = false; }
  };
}
