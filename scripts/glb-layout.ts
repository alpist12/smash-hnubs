import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import type { Item, V3 } from '../src/data/types';
import type { Layout } from '../src/data/layout';
import { model } from '../src/scene/models';

interface Node { name?: string; extras?: { id?: string }; children?: number[]; matrix?: number[]; translation?: number[]; rotation?: number[]; scale?: number[] }
function numbers(value: number[] | undefined, fallback: number[], label: string) {
  if (value === undefined) return fallback;
  if (!Array.isArray(value) || value.length !== fallback.length || !value.every(Number.isFinite)) throw new Error(`유효하지 않은 ${label}`);
  return value;
}
export function readGLBLayout(bytes: Uint8Array, items: Item[], room: { width: number; depth: number; height: number; minZ?: number; maxZ?: number }): Layout {
  if (bytes.byteLength > 100 * 1024 * 1024 || bytes.byteLength < 20) throw new Error('GLB 파일 크기가 잘못되었습니다.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== bytes.byteLength) throw new Error('정상적인 GLB 2.0 파일이 아닙니다.');
  let data: { asset?: { version?: string }; nodes?: Node[]; scene?: number; scenes?: { nodes?: number[] }[] } | undefined;
  for (let offset = 12; offset < bytes.byteLength;) {
    if (offset + 8 > bytes.byteLength) throw new Error('GLB 청크가 잘렸습니다.');
    const length = view.getUint32(offset, true), type = view.getUint32(offset + 4, true);
    if (length % 4 || length > bytes.byteLength - offset - 8) throw new Error('GLB 청크 길이가 잘못되었습니다.');
    if (type === 0x4e4f534a) data = JSON.parse(new TextDecoder().decode(bytes.subarray(offset + 8, offset + 8 + length)));
    offset += 8 + length;
  }
  const nodes = data?.nodes, roots = data?.scenes?.[data.scene ?? 0]?.nodes;
  if (data?.asset?.version !== '2.0' || !Array.isArray(nodes) || nodes.length > 10000 || !Array.isArray(roots)) throw new Error('GLB 씬 구조를 읽을 수 없습니다.');
  const originals = new Map(items.map(item => [item.id, item])), layout: Layout = {}, seen = new Set<number>();
  const up = new Vector3(0, 1, 0);
  function visit(index: number, parent: Matrix4, depth: number) {
    if (!Number.isInteger(index) || index < 0 || index >= nodes!.length || seen.has(index) || depth > 256) throw new Error('중복되거나 순환하는 GLB 노드입니다.');
    seen.add(index); const node = nodes![index];
    if (!node || typeof node !== 'object') throw new Error('유효하지 않은 GLB 노드입니다.');
    const local = new Matrix4();
    if (node.matrix) local.fromArray(numbers(node.matrix, new Matrix4().toArray(), '변환 행렬'));
    else {
      const t = numbers(node.translation, [0, 0, 0], '위치'), q = numbers(node.rotation, [0, 0, 0, 1], '회전'), s = numbers(node.scale, [1, 1, 1], '크기');
      const rotation = new Quaternion(...q as [number, number, number, number]);
      if (rotation.lengthSq() < .000001) throw new Error('회전 값이 잘못되었습니다.');
      local.compose(new Vector3(...t as V3), rotation.normalize(), new Vector3(...s as V3));
    }
    const world = parent.clone().multiply(local), id = node.extras?.id ?? node.name ?? '', original = originals.get(id);
    if (original && !original.fixed) {
      if (layout[id]) throw new Error(`같은 이름의 가구가 중복되었습니다: ${id}`);
      const p = new Vector3(), q = new Quaternion(), scale = new Vector3(); world.decompose(p, q, scale);
      if (scale.x < .2 || scale.x > 3 || Math.abs(scale.x - scale.y) > .0001 || Math.abs(scale.x - scale.z) > .0001) throw new Error(`${id}: S 키로 모든 축을 같은 비율로 확대·축소해 주세요 (0.2~3배).`);
      if (up.clone().applyQuaternion(q).distanceTo(up) > .001) throw new Error(`${id}: 배치 회전은 Blender의 Z축 회전만 지원합니다.`);
      const yaw = new Euler().setFromQuaternion(q, 'YXZ').y;
      if (!p.toArray().every(Number.isFinite) || !Number.isFinite(yaw)) throw new Error(`${id}: 변환 값이 잘못되었습니다.`);
      for (const part of model(original)) for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
        const corner = new Vector3(x * part.size[0] / 2, y * part.size[1] / 2, z * part.size[2] / 2);
        if (part.rotation) corner.applyEuler(new Euler(...part.rotation));
        corner.add(new Vector3(...part.pos)).multiplyScalar(scale.x).applyAxisAngle(up, yaw).add(p);
        if (Math.abs(corner.x) > room.width / 2 + .02 || corner.z < (room.minZ ?? -room.depth / 2) - .02 || corner.z > (room.maxZ ?? room.depth / 2) + .02 || corner.y < -.03 || corner.y > room.height + .02) throw new Error(`${id}: 가구가 방의 벽·바닥·천장 밖으로 나갑니다.`);
      }
      const round = (n: number) => Math.round(n * 1e6) / 1e6;
      layout[id] = { pos: p.toArray().map(round) as V3, rotation: round(yaw), scale: round(scale.x), ...(original.sourceId ? { sourceId: original.sourceId } : {}), ...(original.parentId ? { parentId: original.parentId } : {}) };
    }
    if (node.children !== undefined && !Array.isArray(node.children)) throw new Error('노드 자식 목록이 잘못되었습니다.');
    for (const child of node.children ?? []) visit(child, world, depth + 1);
  }
  for (const root of roots) visit(root, new Matrix4(), 0);
  for (const item of items) if (!item.fixed && !layout[item.id]) throw new Error(`가구 그룹을 찾을 수 없습니다: ${item.id}. 이름을 유지하고 전체 씬을 내보내 주세요.`);
  return layout;
}
