import { Euler, Vector3 } from 'three';
import type { Item, V3 } from '../src/data/types';
import type { Layout, Placement } from '../src/data/layout';
import { ROOM, WORLD, DEFAULT_ITEMS } from '../src/data/room';
import { model } from '../src/scene/models';

export function checkRoomBounds(item: Item) {
  if (!item.pos.every(Number.isFinite) || !Number.isFinite(item.rotation ?? 0) || !Number.isFinite(item.scale ?? 1) || (item.scale ?? 1) < .2 || (item.scale ?? 1) > 3) throw new Error('위치와 크기 값을 확인해 주세요.');
  for (const part of model(item)) for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
    const p = new Vector3(x * part.size[0] / 2, y * part.size[1] / 2, z * part.size[2] / 2);
    if (part.rotation) p.applyEuler(new Euler(...part.rotation));
    p.add(new Vector3(...part.pos)).multiplyScalar(item.scale ?? 1).applyAxisAngle(new Vector3(0, 1, 0), item.rotation ?? 0).add(new Vector3(...item.pos));
    if (Math.abs(p.x) > ROOM.width / 2 + .02 || p.z < WORLD.minZ - .02 || p.z > WORLD.maxZ + .02 || p.y < -.03 || p.y > ROOM.height + .02) throw new Error('가구가 방 밖으로 나갑니다. 위치나 크기를 줄여 주세요.');
  }
}
function onTop(parent: Item, item: Item) {
  if (item.fixed || item.id === parent.id || !['desk', 'table'].includes(parent.kind)) return false;
  if (item.parentId && item.parentId !== parent.id) return false;
  if (parent.sourceId && !item.parentId) return false;
  const local = new Vector3(...item.pos).sub(new Vector3(...parent.pos)).applyAxisAngle(new Vector3(0, 1, 0), -(parent.rotation ?? 0));
  const scale = parent.scale ?? 1;
  return Math.abs(local.y - .8 * scale) < .08 && Math.abs(local.x) < (parent.width ?? 1.55) * scale / 2 && Math.abs(local.z) < (parent.depth ?? 1) * scale / 2;
}
export function changePlacement(items: Item[], id: string, placement: Partial<Placement>): Item[] {
  const original = items.find(item => item.id === id);
  if (!original || original.fixed) throw new Error('이 가구는 편집할 수 없습니다.');
  const updated = { ...original, ...placement }, yaw = (updated.rotation ?? 0) - (original.rotation ?? 0), ratio = (updated.scale ?? 1) / (original.scale ?? 1);
  const up = new Vector3(0, 1, 0), parentPos = new Vector3(...original.pos);
  return items.map(item => {
    let next = item;
    if (item.id === id) next = updated;
    else if (onTop(original, item)) {
        const pos = new Vector3(...item.pos).sub(parentPos).multiplyScalar(ratio).applyAxisAngle(up, yaw).add(new Vector3(...updated.pos));
        next = { ...item, pos: pos.toArray() as V3, rotation: (item.rotation ?? 0) + yaw, scale: (item.scale ?? 1) * ratio };
    }
    if (next !== item) checkRoomBounds(next);
    return next;
  });
}
export function toLayout(items: Item[]): Layout {
  const layout: Layout = Object.fromEntries(items.filter(item => !item.fixed).map(item => [item.id, { pos: item.pos.map(n => Math.round(n * 1e6) / 1e6) as V3, rotation: item.rotation ?? 0, scale: item.scale ?? 1, ...(item.sourceId ? { sourceId: item.sourceId } : {}), ...(item.parentId ? { parentId: item.parentId } : {}) }]));
  for (const original of DEFAULT_ITEMS) if (!original.fixed && !items.some(item => item.id === original.id)) layout[original.id] = { pos: original.pos, rotation: original.rotation ?? 0, scale: 1, hidden: true };
  return layout;
}
export function duplicateItems(items: Item[], id: string) {
  const selected = items.find(item => item.id === id);
  if (!selected || selected.fixed) throw new Error('복사할 가구를 선택하세요.');
  const group = items.filter(item => item.id === id || onTop(selected, item));
  if (items.filter(item => !item.fixed).length + group.length > 200) throw new Error('성능을 위해 가구는 최대 200개까지 배치할 수 있습니다.');
  for (const [dx, dz] of [[.4, .4], [-.4, .4], [.4, -.4], [-.4, -.4], [0, 0]]) {
    const ids = new Set(items.map(item => item.id));
    try {
      const copies = group.map(item => {
        const sourceId = item.sourceId ?? item.id; let number = 1;
        while (ids.has(`copy-${sourceId}-${number}`)) number++;
        const id = `copy-${sourceId}-${number}`; ids.add(id);
        const copy = { ...item, id, sourceId, pos: [item.pos[0] + dx, item.pos[1], item.pos[2] + dz] as V3 };
        checkRoomBounds(copy); return copy;
      });
      const parentIds = new Map(group.map((item, index) => [item.id, copies[index].id]));
      for (const item of copies) if (item.parentId && parentIds.has(item.parentId)) item.parentId = parentIds.get(item.parentId)!;
      return { items: [...items, ...copies], selected: copies.find(item => item.sourceId === (selected.sourceId ?? selected.id))!.id };
    } catch { /* 벽 가까이에서는 다른 방향으로 복사를 시도한다. */ }
  }
  throw new Error('복사할 공간이 부족합니다. 가구를 먼저 안쪽으로 옮겨 주세요.');
}
export function removeItems(items: Item[], id: string) {
  const selected = items.find(item => item.id === id);
  if (!selected || selected.fixed) return items;
  return items.filter(item => item.id !== id && !onTop(selected, item));
}
