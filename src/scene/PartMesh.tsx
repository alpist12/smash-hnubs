import { memo } from 'react';
import { BoxGeometry, BufferGeometry, CylinderGeometry, Float32BufferAttribute, Vector3 } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Part } from '../data/types';
import { material, texturedMaterial } from './materials';
import { useGame } from '../game/store';
import { GRAPHICS, type Quality } from './graphics';
import { partUV } from './partUV';
import { prismAxes } from '../physics/fracture';
const geometries = new Map<string, BufferGeometry>();

/** 다각형 단면 기둥(불규칙 조각) 지오메트리. 면마다 바깥쪽을 보도록 감는다. */
function prismGeometry(part: Part) {
  const axis = part.axis ?? 1, [a, b] = prismAxes(axis), h = part.size[axis] / 2, poly = part.poly!;
  const point = (u: number, v: number, s: number) => { const p = new Vector3(); p.setComponent(a, u); p.setComponent(b, v); p.setComponent(axis, s); return p; };
  const tris: Vector3[][] = [];
  for (let i = 1; i < poly.length - 1; i++) {
    tris.push([point(...poly[0], h), point(...poly[i], h), point(...poly[i + 1], h)]);
    tris.push([point(...poly[0], -h), point(...poly[i + 1], -h), point(...poly[i], -h)]);
  }
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    tris.push([point(...p, -h), point(...q, -h), point(...q, h)], [point(...p, -h), point(...q, h), point(...p, h)]);
  }
  const groups: { start: number; count: number; material: number }[] = [];
  const pos: number[] = [], uv: number[] = [], e1 = new Vector3(), e2 = new Vector3(), n = new Vector3();
  for (const t of tris) {
    e1.subVectors(t[1], t[0]); e2.subVectors(t[2], t[0]); n.crossVectors(e1, e2);
    const c = t[0].clone().add(t[1]).add(t[2]).divideScalar(3);
    if (n.dot(c) < 0) { [t[1], t[2]] = [t[2], t[1]]; n.negate(); }
    const an = [Math.abs(n.x), Math.abs(n.y), Math.abs(n.z)], major = an.indexOf(Math.max(...an));
    const materialIndex = major === axis ? 0 : 1, previous = groups[groups.length - 1];
    if (previous?.material === materialIndex) previous.count += 3;
    else groups.push({ start: pos.length / 3, count: 3, material: materialIndex });
    for (const v of t) { pos.push(v.x, v.y, v.z); uv.push(...partUV(part, v.toArray(), n.toArray())); }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  for (const group of groups) g.addGroup(group.start, group.count, group.material);
  g.computeVertexNormals(); g.computeBoundingSphere();
  return g;
}

export function partGeometry(part: Part, quality: Quality) {
  const settings = GRAPHICS[quality];
  const key = part.poly ? `poly:${part.axis}:${part.size[part.axis ?? 1].toFixed(4)}:${part.poly.map(p => p.map(n => n.toFixed(4)).join(',')).join(';')}:${part.uvOffset?.join(',')}:${part.uvSize?.join(',')}` : `${quality}:${part.shape}:${part.size.join(',')}:${part.round}`;
  if (!geometries.has(key)) {
    geometries.set(key, part.poly ? prismGeometry(part) : part.shape === 'cylinder' ? new CylinderGeometry(part.size[0] / 2, part.size[2] / 2, part.size[1], settings.cylinderSegments) : part.round ? new RoundedBoxGeometry(...part.size, settings.roundedSegments, Math.min(part.round, ...part.size.map(n => n / 2))) : new BoxGeometry(...part.size));
    // 부서진 조각 지오메트리가 끝없이 쌓이지 않도록 오래된 것부터 정리한다.
    if (geometries.size > 4000) { const first = geometries.keys().next().value!; geometries.get(first)?.dispose(); geometries.delete(first); }
  }
  return geometries.get(key)!;
}
export function partMaterial(part: Part, damaged = false) {
  if (part.poly && part.texture) return [texturedMaterial(part.texture, damaged), material('white', '#c5c0b5', damaged)];
  return part.texture ? texturedMaterial(part.texture, damaged) : material(part.finish, part.color, damaged, part.finish === 'wood' && part.size[1] > part.size[0]);
}
export const PartMesh = memo(function PartMesh({ part, damaged = false }: { part: Part; damaged?: boolean }) {
  const quality = useGame(s => s.quality);
  return <mesh name={part.name} position={part.pos} rotation={part.rotation} geometry={partGeometry(part, quality)} material={partMaterial(part, damaged)} castShadow receiveShadow dispose={null} />;
});
