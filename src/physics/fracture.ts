import { Euler, Vector3 } from 'three';
import type { Part, V3 } from '../data/types';

const volume = (p: Part) => p.size[0] * p.size[1] * p.size[2];
/**
 * 사전 분할 박스 파편. 가장 큰 조각을 고르지 않은 비율(30~70%)로 계속 쪼개
 * 크기가 제각각인 조각조각 파편을 만든다. 원통과 아주 작은 부품은 형태를 유지한다.
 * 부피와 무게중심은 원본과 같게 보존한다.
 */
export function fractureParts(parts: Part[], limit = 24, seed = 7): Part[] {
  let state = seed % 2147483647 || 1;
  const random = () => { state = state * 16807 % 2147483647; return state / 2147483647; };
  const pieces = parts.filter(p => volume(p) > .0004).sort((a, b) => volume(b) - volume(a)).slice(0, Math.min(10, limit));
  while (pieces.length < limit) {
    let index = -1, largest = 0;
    pieces.forEach((p, i) => {
      if (p.shape === 'cylinder' || Math.max(...p.size) <= .16 || volume(p) <= .0003) return;
      if (volume(p) > largest) { index = i; largest = volume(p); }
    });
    if (index < 0) break;
    const part = pieces[index];
    // 대체로 가장 긴 축을 자르되, 가끔 두 번째로 긴 축도 잘라 길쭉한 막대만 생기지 않게 한다.
    const order = [0, 1, 2].sort((a, b) => part.size[b] - part.size[a]);
    const axis = random() < .25 && part.size[order[1]] > .16 ? order[1] : order[0];
    const ratio = .3 + random() * .4, full = part.size[axis];
    const lengths = [full * ratio, full * (1 - ratio)];
    const centers = [-full / 2 + lengths[0] / 2, full / 2 - lengths[1] / 2];
    pieces.splice(index, 1, ...lengths.map((length, k) => {
      const size = [...part.size] as V3; size[axis] = length;
      const offset = new Vector3(); offset.setComponent(axis, centers[k]);
      if (part.rotation) offset.applyEuler(new Euler(...part.rotation));
      offset.add(new Vector3(...part.pos));
      return { ...part, name: part.name.endsWith('파편') ? part.name : `${part.name} 파편`, size, pos: offset.toArray() as V3, round: Math.min(part.round ?? 0, .006) };
    }));
  }
  return pieces;
}
