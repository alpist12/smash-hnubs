import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ITEMS, WORLD } from '../src/data/room';
import { applyLayout } from '../src/data/layout';
import { readGLBLayout } from '../scripts/glb-layout';

function scene() {
  const items = DEFAULT_ITEMS.filter(i => !i.fixed);
  return { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [
    { name: 'Scene', children: items.map((_, i) => i + 1), translation: [.005, 0, 0] },
    ...items.map(i => ({ name: i.id, translation: [...i.pos], rotation: [0, Math.sin((i.rotation ?? 0) / 2), 0, Math.cos((i.rotation ?? 0) / 2)], scale: [1, 1, 1] })),
  ] };
}
function glb(data: unknown) {
  const json = new TextEncoder().encode(JSON.stringify(data));
  const padded = Math.ceil(json.length / 4) * 4, bytes = new Uint8Array(20 + padded), view = new DataView(bytes.buffer);
  view.setUint32(0, 0x46546c67, true); view.setUint32(4, 2, true); view.setUint32(8, bytes.length, true);
  view.setUint32(12, padded, true); view.setUint32(16, 0x4e4f534a, true); bytes.fill(32, 20); bytes.set(json, 20);
  return bytes;
}
test('Blender group transforms include parents and preserve uniform size changes', () => {
  const data = scene(); data.nodes[1].scale = [1.1, 1.1, 1.1];
  const layout = readGLBLayout(glb(data), DEFAULT_ITEMS, WORLD);
  const item = DEFAULT_ITEMS.find(i => !i.fixed)!;
  assert.ok(Math.abs(layout[item.id].pos[0] - item.pos[0] - .005) < .000001);
  assert.equal(layout[item.id].scale, 1.1);
  const placed = applyLayout(DEFAULT_ITEMS, layout);
  assert.equal(placed.find(i => i.id === item.id)!.scale, 1.1);
  assert.ok(placed.find(i => i.fixed) === DEFAULT_ITEMS.find(i => i.fixed));
});
test('bad GLB files, renamed groups, tilt, nonuniform scale and positions outside the room are rejected', () => {
  const bytes = glb(scene()); assert.throws(() => readGLBLayout(bytes.subarray(0, 22), DEFAULT_ITEMS, WORLD));
  let data = scene(); data.nodes[1].name = 'renamed'; assert.throws(() => readGLBLayout(glb(data), DEFAULT_ITEMS, WORLD), /찾을 수 없습니다/);
  data = scene(); data.nodes[1].scale = [1.2, 1, 1]; assert.throws(() => readGLBLayout(glb(data), DEFAULT_ITEMS, WORLD), /같은 비율/);
  data = scene(); data.nodes[1].translation = [100, 0, 0]; assert.throws(() => readGLBLayout(glb(data), DEFAULT_ITEMS, WORLD), /밖으로/);
  data = scene(); data.nodes[1].rotation = [Math.sin(.1), 0, 0, Math.cos(.1)]; assert.throws(() => readGLBLayout(glb(data), DEFAULT_ITEMS, WORLD), /Z축/);
  assert.throws(() => applyLayout(DEFAULT_ITEMS, { missing: { pos: [0, 0, 0], rotation: 0, scale: 1 } }), /알 수 없는/);
  assert.throws(() => applyLayout(DEFAULT_ITEMS, { [DEFAULT_ITEMS[0].id]: { pos: [Infinity, 0, 0], rotation: 0, scale: 1 } }), /유효하지/);
});
