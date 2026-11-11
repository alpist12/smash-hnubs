import { writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { Scene, Group, Mesh, BoxGeometry, CylinderGeometry, MeshStandardMaterial } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { ITEMS, WORLD, specs } from '../src/data/room';
import { model } from '../src/scene/models';

// GLTFExporter uses the browser FileReader API; Blob itself is native in Node 22+.
class ExportFileReader {
  result: ArrayBuffer | null = null;
  onloadend?: () => void;
  readAsArrayBuffer(blob: Blob) { void blob.arrayBuffer().then(buffer => { this.result = buffer; this.onloadend?.(); }); }
}
globalThis.FileReader = ExportFileReader as unknown as typeof FileReader;
const scene = new Scene(); scene.name = 'HNUBS_MainRoom';
scene.userData = { units: 'meters', reference: 'User supplied floor plan; dimensions provisional', room: WORLD };
const colors = { wood: '#d1b17a', metal: '#454b50', black: '#292d31', screen: '#203c4b', fabric: '#919da8', leather: '#c6c5ae', paper: '#d8d7c9', white: '#e5e3d8', glass: '#9caeb4' };
for (const item of ITEMS) {
  const group = new Group(); group.name = item.id; group.position.set(...item.pos); group.rotation.y = item.rotation ?? 0;
  group.scale.setScalar(item.scale ?? 1);
  group.userData = { id: item.id, kind: item.kind, ...specs[item.kind], fixed: item.fixed ?? false };
  for (const part of model(item)) {
    const geometry = part.shape === 'cylinder' ? new CylinderGeometry(part.size[0] / 2, part.size[2] / 2, part.size[1], 12) : part.round ? new RoundedBoxGeometry(...part.size, 1, Math.min(part.round, ...part.size.map(v => v / 2))) : new BoxGeometry(...part.size);
    const mesh = new Mesh(geometry, new MeshStandardMaterial({ color: part.color ?? colors[part.finish], roughness: .8, metalness: part.finish === 'metal' ? .65 : 0 }));
    mesh.name = part.name; mesh.position.set(...part.pos); if (part.rotation) mesh.rotation.set(...part.rotation);
    group.add(mesh);
  }
  scene.add(group);
}
const floor = new Mesh(new BoxGeometry(WORLD.width, .12, WORLD.depth), new MeshStandardMaterial({ color: '#817575', roughness: 1 }));
floor.name = '방송국 바닥'; floor.position.set(0, -.06, WORLD.centerZ); scene.add(floor);
const result = await new GLTFExporter().parseAsync(scene, { binary: true });
assert.ok(result instanceof ArrayBuffer);
assert.equal(new DataView(result).getUint32(0, true), 0x46546c67);
assert.equal(new DataView(result).getUint32(8, true), result.byteLength);
await mkdir('public/models', { recursive: true });
await writeFile('public/models/hnubs-main-room.glb', new Uint8Array(result));
console.log(`Exported ${ITEMS.length} named furniture groups (${(result.byteLength / 1024 / 1024).toFixed(2)} MiB).`);
