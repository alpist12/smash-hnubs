import { Euler, Quaternion, Vector3 } from 'three';
import type { Item, Part, V3 } from '../data/types';

/**
 * 조각 파편 (SMASH HANBAT 방식).
 * 부품을 '다각형 단면 × 두께' 기둥(prism)으로 보고, 아무 각도의 직선으로 단면을 1~2번 자르고
 * 필요하면 두께 방향도 한 번 자른다. 이걸 반복하면 상자 조각이 아니라 삼각형·사다리꼴·쐐기 같은
 * 불규칙한 조각이 나온다. 부피와 무게중심은 원본과 같게 유지한다.
 */
type P2 = [number, number];
export type Random = () => number;

export function seeded(seed: number): Random {
  let state = seed % 2147483647 || 1;
  return () => { state = state * 16807 % 2147483647; return state / 2147483647; };
}
const other = (axis: 0 | 1 | 2): [number, number] => axis === 0 ? [1, 2] : axis === 1 ? [0, 2] : [0, 1];
function area2(poly: P2[]) { let a = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; a += p[0] * q[1] - q[0] * p[1]; } return a; }
function centroid(poly: P2[]): P2 {
  let a = 0, x = 0, y = 0;
  for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length], c = p[0] * q[1] - q[0] * p[1]; a += c; x += (p[0] + q[0]) * c; y += (p[1] + q[1]) * c; }
  if (Math.abs(a) < 1e-9) return [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length];
  return [x / (3 * a), y / (3 * a)];
}
/** n·p <= d 쪽만 남긴다 (Sutherland–Hodgman). */
function clip(poly: P2[], nx: number, ny: number, d: number): P2[] {
  const out: P2[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], da = nx * a[0] + ny * a[1] - d, db = nx * b[0] + ny * b[1] - d;
    if (da <= 0) out.push(a);
    if ((da < 0) !== (db < 0) && da !== db) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
const volume = (p: Part) => p.poly ? Math.abs(area2(p.poly)) / 2 * p.size[p.axis ?? 1] : p.size[0] * p.size[1] * p.size[2];
const largest = (p: Part) => Math.max(...p.size);

/** 상자·원통 부품을 기둥(prism) 조각으로 바꾼다. 가장 얇은 축이 두께 방향이 된다. */
function toPrism(part: Part): Part {
  if (part.poly) return part;
  if (part.shape === 'cylinder') {
    const poly: P2[] = [];
    for (let i = 0; i < 8; i++) { const a = (i + .5) / 8 * Math.PI * 2; poly.push([Math.cos(a) * part.size[0] / 2, Math.sin(a) * part.size[2] / 2]); }
    return { ...part, shape: 'box', axis: 1, poly, round: 0 };
  }
  const axis = ([0, 1, 2] as const).reduce((m, i) => part.size[i] < part.size[m] ? i : m, 0 as 0 | 1 | 2);
  const [a, b] = other(axis), ha = part.size[a] / 2, hb = part.size[b] / 2;
  return { ...part, axis, poly: [[-ha, -hb], [ha, -hb], [ha, hb], [-ha, hb]], round: 0 };
}

/** 조각 하나를 2~6개로 쪼갠다. 너무 작으면 null. */
export function splitPiece(source: Part, random: Random = Math.random, min = .1): Part[] | null {
  const part = toPrism(source), axis = part.axis ?? 1, [a, b] = other(axis), poly = part.poly!;
  const horiz = Math.max(part.size[a], part.size[b]), height = part.size[axis];
  if (Math.max(horiz, height) < min) return null;
  const lines = horiz > .45 * height ? 2 : horiz > .25 * height ? 1 : 0;
  const thick = height > .45 * horiz || lines === 0;
  let polys = [poly];
  const a1 = random() * Math.PI;
  for (let n = 0; n < lines; n++) {
    const angle = n === 0 ? a1 : a1 + Math.PI / 2 + (random() - .5) * .7;
    const nx = Math.cos(angle), ny = Math.sin(angle), d = (random() - .5) * .36 * horiz;
    const next: P2[][] = [];
    for (const p of polys) for (const q of [clip(p, nx, ny, d), clip(p, -nx, -ny, -d)]) if (q.length >= 3 && Math.abs(area2(q)) > 1e-5) next.push(q);
    polys = next;
  }
  const spans: [number, number][] = thick ? (() => { const m = (random() - .5) * .3 * height; return [[-height / 2, m], [m, height / 2]] as [number, number][]; })() : [[-height / 2, height / 2]];
  if (polys.length * spans.length < 2) return null;
  const rotation = part.rotation ? new Euler(...part.rotation) : undefined;
  const out: Part[] = [];
  for (const p of polys) {
    const [cx, cy] = centroid(p), local = p.map(([x, y]) => [x - cx, y - cy] as P2);
    if (area2(local) < 0) local.reverse();
    const sa = Math.max(...local.map(q => q[0])) - Math.min(...local.map(q => q[0])), sb = Math.max(...local.map(q => q[1])) - Math.min(...local.map(q => q[1]));
    for (const [y0, y1] of spans) {
      const size = [0, 0, 0] as V3; size[a] = sa; size[b] = sb; size[axis] = y1 - y0;
      const offset = new Vector3(); offset.setComponent(a, cx); offset.setComponent(b, cy); offset.setComponent(axis, (y0 + y1) / 2);
      const uvOffset = offset.clone().add(new Vector3(...(part.uvOffset ?? [0, 0, 0]))).toArray() as V3;
      if (rotation) offset.applyEuler(rotation);
      offset.add(new Vector3(...part.pos));
      out.push({ ...part, name: part.name.endsWith('파편') ? part.name : `${part.name} 파편`, size, pos: offset.toArray() as V3, poly: local, axis, round: 0, uvOffset, uvSize: part.uvSize ?? [...part.size] as V3 });
    }
  }
  return out;
}

/** 맞기 전에 미리 나눠 둘 조각. 가장 큰 조각부터 계속 쪼갠다. */
export function fractureParts(parts: Part[], limit = 24, seed = 7): Part[] {
  const random = seeded(seed);
  const pieces = parts.filter(p => volume(p) > .00015);
  const tiny = parts.filter(p => volume(p) <= .00015);
  const stuck = new Set<Part>();
  let guard = 0;
  while (pieces.length < limit && guard++ < 300) {
    let index = -1, best = 0;
    pieces.forEach((p, i) => { const s = largest(p) * Math.cbrt(volume(p)); if (!stuck.has(p) && largest(p) > .14 && s > best) { best = s; index = i; } });
    if (index < 0) break;
    const kids = splitPiece(pieces[index], random, .14);
    if (!kids) { stuck.add(pieces[index]); continue; }
    pieces.splice(index, 1, ...kids);
  }
  return [...pieces, ...tiny];
}

/** 벽의 표면·속벽·뒷면이 같은 작은 구획으로 갈라지도록 함께 자른다. */
export function fractureWallParts(item: Item, parts: Part[], limit = 24, seed = 7): Part[] {
  const body = parts[0], w = body.size[0], h = body.size[1], bottom = body.pos[1] - h / 2;
  const random = seeded(seed), target = Math.max(8, Math.floor(limit / 2));
  const columns = Math.max(1, Math.ceil(Math.sqrt(target * w / h))), rows = Math.max(1, Math.ceil(target / columns));
  const dx = w / columns, dy = h / rows;
  const points = Array.from({ length: rows + 1 }, (_, y) => Array.from({ length: columns + 1 }, (_, x): P2 => [
    -w / 2 + x * dx + (x > 0 && x < columns ? (random() - .5) * dx * .18 : 0),
    bottom + y * dy + (y > 0 && y < rows ? (random() - .5) * dy * .18 : 0),
  ]));
  const out: Part[] = [];
  for (const source of parts) {
    if (source.name.includes('문틀')) { out.push(source); continue; }
    const q = new Quaternion().setFromEuler(new Euler(...(source.rotation ?? [0, 0, 0]))), inverse = q.clone().invert();
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      let polygon = [points[row][col], points[row][col + 1], points[row + 1][col + 1], points[row + 1][col]].map(([x, y]): P2 => {
        const p = new Vector3(x - source.pos[0], y - source.pos[1], 0).applyQuaternion(inverse); return [p.x, p.y];
      });
      if (area2(polygon) < 0) polygon.reverse();
      polygon = clip(clip(clip(clip(polygon, 1, 0, source.size[0] / 2), -1, 0, source.size[0] / 2), 0, 1, source.size[1] / 2), 0, -1, source.size[1] / 2);
      if (polygon.length < 3 || Math.abs(area2(polygon)) < 1e-7) continue;
      const [cx, cy] = centroid(polygon), local = polygon.map(([x, y]): P2 => [x - cx, y - cy]);
      const pos = new Vector3(cx, cy, 0).applyQuaternion(q).add(new Vector3(...source.pos));
      out.push({ ...source, name: `${source.name} 파편`, pos: pos.toArray() as V3,
        size: [Math.max(...local.map(p => p[0])) - Math.min(...local.map(p => p[0])), Math.max(...local.map(p => p[1])) - Math.min(...local.map(p => p[1])), source.size[2]],
        shape: 'box', axis: 2, poly: local, round: 0, uvOffset: [cx, cy, 0], uvSize: [...source.size], fractureGroup: `${item.id}:${col}:${row}` });
    }
  }
  return out;
}

/** 같은 벽 구획의 앞뒤를 함께 제거한다. */
export function expandWallSelection(pieces: Part[], selected: number[], removed: number[]): number[] {
  const groups = new Set(selected.map(i => pieces[i].fractureGroup).filter((group): group is string => !!group));
  const ids = new Set(selected), gone = new Set(removed);
  return pieces.flatMap((part, i) => !gone.has(i) && (ids.has(i) || !!part.fractureGroup && groups.has(part.fractureGroup)) ? [i] : []);
}

/** 기둥 조각의 꼭짓점 (부품 로컬 좌표, 회전 전). 볼록 충돌체에 쓴다. */
export function prismPoints(part: Part): number[] {
  if (!part.poly) { const [x, y, z] = part.size.map(n => n / 2); const out: number[] = []; for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) out.push(sx * x, sy * y, sz * z); return out; }
  const axis = part.axis ?? 1, [a, b] = other(axis), h = part.size[axis] / 2, out: number[] = [];
  for (const s of [-h, h]) for (const [u, v] of part.poly) { const p = [0, 0, 0]; p[a] = u; p[b] = v; p[axis] = s; out.push(...p); }
  return out;
}
export { other as prismAxes };
