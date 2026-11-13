import type { Item, V3 } from './types';
import savedLayout from './layout.json';

// Old shipped overlaps are repaired without clearing independently edited placements.
const separation: Record<string, V3> = {
  'desk-73': [-.1, 0, 0], 'desk-88': [.1, 0, 0], 'copy-desk-88-2': [-1, 0, 0],
  'mediaCabinet-92': [-.4, 0, 0], 'mediaCabinet-93': [-.4, 0, 0], 'mediaCabinet-94': [-.4, 0, 0],
  'copy-mediaCabinet-94-1': [-.4, 0, 0], 'carton-95': [-.4, 0, 0], 'carton-96': [-.4, 0, 0],
  'copy-partition-72-1': [0, 0, 1],
};
export interface Placement { pos: V3; rotation: number; scale: number; sourceId?: string; hidden?: boolean; parentId?: string }
export type Layout = Record<string, Placement>;

export function applyLayout(items: Item[], value: unknown): Item[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('배치 데이터는 객체여야 합니다.');
  const entries = value as Record<string, unknown>;
  if (Object.keys(entries).length > 400) throw new Error('배치 항목이 너무 많습니다.');
  const originals = new Map(items.map(item => [item.id, item]));
  for (const [id, entry] of Object.entries(entries)) {
    if (!entry || typeof entry !== 'object') throw new Error(`유효하지 않은 배치: ${id}`);
    const p = entry as Placement;
    if (!originals.has(id) && (!/^copy-[a-zA-Z]+-\d+-\d+$/.test(id) || !p.sourceId || !originals.has(p.sourceId) || originals.get(p.sourceId)!.fixed)) throw new Error(`알 수 없는 가구 ID: ${id}`);
  }
  const placed: Item[] = [];
  function append(item: Item, id: string) {
    const p = entries[id] as Placement | undefined;
    if (!p) { placed.push(item); return; }
    if (item.fixed) throw new Error(`고정 구조물은 배치 가져오기 대상이 아닙니다: ${id}`);
    if (p.hidden === true) return;
    if (!Array.isArray(p.pos) || p.pos.length !== 3 || !p.pos.every(Number.isFinite) || !Number.isFinite(p.rotation) || !Number.isFinite(p.scale) || p.scale < .2 || p.scale > 3) throw new Error(`유효하지 않은 위치·회전·크기: ${id}`);
    if (p.parentId !== undefined && (typeof p.parentId !== 'string' || p.parentId === id || (!originals.has(p.parentId) && !entries[p.parentId]))) throw new Error(`유효하지 않은 책상 연결: ${id}`);
    placed.push({ ...item, id, pos: [...p.pos], rotation: p.rotation, scale: p.scale, sourceId: originals.has(id) ? undefined : p.sourceId, parentId: p.parentId ?? item.parentId });
  }
  for (const item of items) append(item, item.id);
  for (const [id, entry] of Object.entries(entries)) if (!originals.has(id)) append(originals.get((entry as Placement).sourceId!)!, id);
  if (placed.filter(item => !item.fixed).length > 200) throw new Error('가구는 최대 200개까지 배치할 수 있습니다.');
  const baseline: Record<string, { pos: number[]; rotation: number; scale: number; parentId?: string }> = savedLayout;
  for (const item of placed) {
    const saved = baseline[item.id], old = entries[item.id] as Placement | undefined;
    const shift = separation[item.id] ?? (saved?.parentId ? separation[saved.parentId] : undefined);
    if (saved && old && shift && old.rotation === saved.rotation && old.scale === saved.scale &&
      item.pos.every((n, i) => Math.abs(n + shift[i] - saved.pos[i]) < 1e-6)) item.pos = [saved.pos[0], saved.pos[1], saved.pos[2]];
  }
  return placed;
}
