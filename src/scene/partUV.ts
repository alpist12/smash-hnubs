import type { Part, V3 } from '../data/types';

/** 원래 BoxGeometry의 면 방향과 UV 범위를 파편에서도 유지한다. */
export function partUV(part: Part, point: V3, normal: V3): [number, number] {
  const size = part.uvSize ?? part.size, offset = part.uvOffset ?? [0, 0, 0];
  const p = point.map((value, i) => (value + offset[i]) / size[i]);
  const abs = normal.map(Math.abs), axis = abs.indexOf(Math.max(...abs));
  if (axis === 0) return [(normal[0] > 0 ? -p[2] : p[2]) + .5, p[1] + .5];
  if (axis === 1) return [p[0] + .5, (normal[1] > 0 ? -p[2] : p[2]) + .5];
  return [(normal[2] > 0 ? p[0] : -p[0]) + .5, p[1] + .5];
}
