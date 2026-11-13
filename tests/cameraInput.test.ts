import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraKeyMotion } from '../src/scene/cameraInput';
import { wallVisible } from '../src/scene/wallVisibility';
import { useGame } from '../src/game/store';

test('WASD changes viewing angles without panning; arrow keys retain view-relative movement', () => {
  const move = (keys: string[], x = 0, z = -1, dt = .1) => cameraKeyMotion(new Set(keys), x, z, dt, 10);
  for (const key of ['KeyW', 'KeyA', 'KeyS', 'KeyD']) {
    const result = move([key]); assert.equal(result.x, 0); assert.equal(result.z, 0);
  }
  assert.ok(move(['KeyW']).tilt < 0); assert.ok(move(['KeyS']).tilt > 0);
  assert.ok(move(['KeyA']).turn < 0); assert.ok(move(['KeyD']).turn > 0);
  assert.ok(move(['ArrowUp'], 1, 0).x > 0); assert.ok(move(['ArrowRight'], 1, 0).z > 0);
  const diagonal = move(['ArrowUp', 'ArrowRight']), straight = move(['ArrowUp']);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.z) - Math.abs(straight.z)) < 1e-9);
  assert.deepEqual(move(['KeyW'], 0, -1, 5), move(['KeyW']));
  assert.ok(Math.abs(move(['ArrowUp', 'ShiftLeft']).z) > Math.abs(straight.z));
  assert.deepEqual(move(['KeyW', 'KeyS']), { x: 0, z: 0, turn: 0, tilt: 0 });
  assert.ok(Math.abs(move(['KeyW', 'ShiftLeft']).tilt) > Math.abs(move(['KeyW']).tilt));
  assert.ok(move(['KeyE']).turn > 0); assert.ok(move(['KeyQ']).turn < 0);
  assert.ok(Number.isFinite(move(['ArrowUp'], 0, 0).z));
});

test('main-to-technical separator stays visible in every preset while outside walls keep cutaway', () => {
  const before = useGame.getState();
  try {
    useGame.setState({ walls: true });
    for (const cameraMode of ['home', 'technical', 'announcer', 'photo', 'top', 'character'] as const) {
      useGame.setState({ cameraMode });
      assert.equal(wallVisible('back', 10, 10), true);
    }
    assert.equal(wallVisible('left', -8, 0), false);
    assert.equal(wallVisible('right', 8, 0), false);
    useGame.setState({ walls: false }); assert.equal(wallVisible('back', 0, 0), false);
  } finally { useGame.setState({ walls: before.walls, cameraMode: before.cameraMode }); }
});
