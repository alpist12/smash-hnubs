import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, DynamicDrawUsage, Euler, InstancedBufferAttribute, InstancedMesh, MeshStandardMaterial, OctahedronGeometry, Quaternion, Vector3 } from 'three';
import type { Part } from '../data/types';
import { useGame } from '../game/store';

/** 핑거스냅 가루. 모든 물체가 하나의 InstancedMesh 링 버퍼를 같이 쓴다. */
// ponytail: 오래된 가루부터 덮어쓰는 고정 풀, 동시에 더 많이 필요하면 MAX를 늘린다.
const MAX = 16000, LIFE = 2.4, ASH = ['#5d554e', '#8a8077', '#3b3530'];
const QUALITY = { low: .3, medium: .6, high: 1 } as const;
const start = new Float32Array(MAX * 3), drift = new Float32Array(MAX * 3), timing = new Float32Array(MAX * 2), sizes = new Float32Array(MAX);
const colors = new Float32Array(MAX * 3);
let cursor = 0, lastSpawn = -1e9, dirty = false;
const color = new Color(), local = new Vector3(), rotation = new Quaternion(), euler = new Euler();

/** 물체 부품의 부피 안에 가루를 채우고, 한쪽에서부터 바람에 날리게 한다. */
export function dissolve(parts: Part[], q: Quaternion, origin: Vector3, scale: number, palette: string[]) {
  const now = performance.now() / 1000, factor = QUALITY[useGame.getState().quality];
  const area = parts.map(p => 2 * (p.size[0] * p.size[1] + p.size[1] * p.size[2] + p.size[0] * p.size[2]) * scale * scale);
  const total = area.reduce((a, b) => a + b, 0) || 1, count = Math.round(Math.min(260, Math.max(16, total * 25)) * factor);
  const grain = Math.min(.07, Math.max(.018, Math.sqrt(total / count) * .45));
  const wind = new Vector3(.9 + Math.random() * .4, .45, (Math.random() - .5) * .6), side = new Vector3(1, 0, 0).applyQuaternion(q);
  const reach = Math.max(...parts.map(p => Math.abs(p.pos[0]) + p.size[0] / 2), .1) * scale;
  for (let n = 0; n < count; n++) {
    let pick = Math.random() * total, k = 0;
    while (k < parts.length - 1 && (pick -= area[k]) > 0) k++;
    const part = parts[k];
    local.set((Math.random() - .5) * part.size[0], (Math.random() - .5) * part.size[1], (Math.random() - .5) * part.size[2]);
    if (part.rotation) local.applyQuaternion(rotation.setFromEuler(euler.set(...part.rotation)));
    local.add(new Vector3(...part.pos)).multiplyScalar(scale).applyQuaternion(q).add(origin);
    const i = cursor; cursor = (cursor + 1) % MAX;
    start.set([local.x, local.y, local.z], i * 3);
    drift.set([wind.x * (.6 + Math.random()), wind.y * (.5 + Math.random()), wind.z + (Math.random() - .5) * .8], i * 3);
    // 한쪽 끝에서 반대쪽으로 쓸려 가듯 흩어진다.
    const sweep = (local.clone().sub(origin).dot(side) / reach + 1) / 2;
    timing[i * 2] = now + .05 + sweep * .7 + Math.random() * .25; timing[i * 2 + 1] = LIFE * (.7 + Math.random() * .5);
    sizes[i] = grain * (.6 + Math.random() * .8);
    color.set(Math.random() < .3 ? ASH[n % ASH.length] : (part.color ?? palette[n % palette.length])).toArray(colors, i * 3);
  }
  lastSpawn = now; dirty = true;
}

export function SnapDust() {
  const round = useGame(s => s.round);
  const mesh = useMemo(() => {
    const m = new InstancedMesh(new OctahedronGeometry(1, 0), new MeshStandardMaterial({ roughness: 1, flatShading: true }), MAX);
    m.instanceMatrix.setUsage(DynamicDrawUsage); m.instanceColor = new InstancedBufferAttribute(colors, 3); m.frustumCulled = false;
    m.instanceMatrix.array.fill(0); m.visible = false; return m;
  }, []);
  useEffect(() => () => { mesh.geometry.dispose(); (mesh.material as MeshStandardMaterial).dispose(); }, [mesh]);
  useEffect(() => { timing.fill(0); sizes.fill(0); mesh.instanceMatrix.array.fill(0); mesh.instanceMatrix.needsUpdate = true; mesh.visible = false; lastSpawn = -1e9; }, [round, mesh]);
  useFrame(() => {
    const now = performance.now() / 1000;
    mesh.visible = now - lastSpawn < 3 + LIFE;
    if (!mesh.visible) return;
    const m = mesh.instanceMatrix.array as Float32Array;
    for (let i = 0; i < MAX; i++) {
      const o = i * 16;
      if (!sizes[i]) continue;
      const t = now - timing[i * 2], life = timing[i * 2 + 1];
      if (t > life) { sizes[i] = 0; m[o] = m[o + 5] = m[o + 10] = 0; continue; }
      const moving = Math.max(0, t), ease = moving ** 1.4, curl = Math.sin(moving * 3 + i) * .12 * moving;
      const s = sizes[i] * (t < 0 ? 1 : Math.max(0, 1 - moving / life));
      m[o] = m[o + 5] = m[o + 10] = s; m[o + 15] = 1;
      m[o + 12] = start[i * 3] + drift[i * 3] * ease + curl;
      m[o + 13] = start[i * 3 + 1] + drift[i * 3 + 1] * ease;
      m[o + 14] = start[i * 3 + 2] + drift[i * 3 + 2] * ease + curl;
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (dirty && mesh.instanceColor) { mesh.instanceColor.needsUpdate = true; dirty = false; }
  });
  return <primitive object={mesh} name="snap-dust" />;
}
