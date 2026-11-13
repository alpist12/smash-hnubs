import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS } from '../src/data/characters';
import { yujinHairGeometry, parkaGeometry, yujinSleeveGeometry, parkaLapelGeometry } from '../src/scene/characterGeometry';
import { CharacterHealth } from '../src/game/characterHealth';
import bat from '../src/weapons/bat';

test('both characters have distinct registration, camera, appearance and health; only Wonjae owns the recording', () => {
  assert.equal(new Set(CHARACTERS.map(p=>p.id)).size,2);
  assert.equal(new Set(CHARACTERS.map(p=>p.camera)).size,2);
  assert.deepEqual(CHARACTERS.map(p=>p.name),['원재 선배','유진 선배']);
  assert.deepEqual(CHARACTERS.map(p=>p.voice),[true,false]);
  const health=CHARACTERS.map(()=>new CharacterHealth());
  health[1].hit(bat.power); assert.equal(health[0].batHits,0); assert.equal(health[1].batHits,1);
  for(let i=0;i<24;i++)health[1].hit(bat.power);
  assert.equal(health[1].gone,true); assert.equal(health[0].gone,false);
});

test('Yujin has bounded shoulder-length wavy hair and an open long parka mesh', () => {
  const hair=yujinHairGeometry(), highlights=yujinHairGeometry(true), coat=parkaGeometry();
  try {
    for(const g of [hair,highlights,coat]) {
      assert.ok(g.getAttribute('position').count>100);
      for(const n of g.getAttribute('position').array)assert.ok(Number.isFinite(n));
      g.computeBoundingBox();
    }
    assert.ok(hair.boundingBox!.min.y<1.2 && hair.boundingBox!.max.y>1.80 && hair.boundingBox!.max.y<1.86);
    assert.ok(coat.boundingBox!.min.y<.4 && coat.boundingBox!.max.y>1.3);
    assert.ok(coat.boundingBox!.max.x-coat.boundingBox!.min.x>.5);
  } finally { hair.dispose();highlights.dispose();coat.dispose(); }
});


test('characters render sculpted faces and never ship reference portraits', async () => {
  const { readFile, readdir } = await import('node:fs/promises');
  const model = await readFile(new URL('../src/scene/CharacterModel.tsx', import.meta.url), 'utf8');
  assert.ok(!/YujinFace|photoFace|\.(jpg|png)|CanvasTexture/.test(model));
  assert.match(model, /head:headGeometry\(\)/);
  assert.match(model, /geometry=\{geometry\.mouth\}/);
  const publicFiles = await readdir(new URL('../public/characters/', import.meta.url));
  assert.ok(publicFiles.every(name => !/\.(jpg|jpeg|png|webp)$/i.test(name)));
});

test('rounded parka sleeves and lapels have finite detailed cloth surfaces', () => {
  for(const side of [-1,1]) {
    const sleeve=yujinSleeveGeometry(side),lapel=parkaLapelGeometry(side);
    try {
      assert.equal(sleeve.getAttribute('uv').count,sleeve.getAttribute('position').count);
      for(const g of [sleeve,lapel])for(const n of g.getAttribute('position').array)assert.ok(Number.isFinite(n));
    } finally {sleeve.dispose();lapel.dispose();}
  }
});
