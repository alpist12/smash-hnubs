import { Euler, Vector3 } from 'three';
import type { Item, Part } from '../data/types';

export function initialColliders(item: Item, parts: Part[]): Part[] {
  const colliders = parts.filter(part => part.collider !== false);
  // 겹친 마감·프레임이 있는 평평한 고정 구조만 합친다. 문틀 통로와 가구 다리의 빈 공간은 유지한다.
  if (item.jambs || !['wallSegment', 'door', 'whiteboard', 'chalkboard', 'poster', 'mirror', 'projectorScreen'].includes(item.kind) || colliders.length < 2) return colliders;
  const min = new Vector3(Infinity, Infinity, Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity);
  for (const part of colliders) for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
    const corner = new Vector3(x * part.size[0] / 2, y * part.size[1] / 2, z * part.size[2] / 2);
    if (part.rotation) corner.applyEuler(new Euler(...part.rotation));
    corner.add(new Vector3(...part.pos)); min.min(corner); max.max(corner);
  }
  return [{ name: '합친 구조 충돌체', pos: min.clone().add(max).multiplyScalar(.5).toArray() as Part['pos'], size: max.clone().sub(min).toArray() as Part['size'], finish: 'white' }];
}
