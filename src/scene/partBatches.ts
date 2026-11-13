import type { Part } from '../data/types';

export function partBatches(parts: Part[]): Part[][] {
  const groups = new Map<string, Part[]>();
  parts.forEach((p, index) => {
    // 투명 유리의 정렬과 불규칙 파편의 개별 형상을 유지한다.
    const key = p.poly || p.finish === 'glass' ? `single:${index}` : JSON.stringify([p.shape ?? 'box', p.size, p.round ?? 0, p.finish, p.color, p.texture]);
    const group = groups.get(key); if (group) group.push(p); else groups.set(key, [p]);
  });
  return [...groups.values()];
}
export function batchDrawCount(parts: Part[]) {
  return partBatches(parts).reduce((sum, group) => sum + (group.length >= 3 ? 1 : group.length), 0);
}
