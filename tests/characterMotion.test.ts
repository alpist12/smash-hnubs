import test from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { Quaternion, Vector3 } from 'three';
import { CHARACTER_MASS, CHARACTER_EXIT_DELAY, CHARACTER_RECOVER_DELAY, kickCharacter, steadyCharacter } from '../src/physics/characterMotion';
import { CharacterHealth } from '../src/game/characterHealth';
import bat from '../src/weapons/bat';

test('Rapier character recoils, recovers, falls on hit 25, and can disable safely after settling', async () => {
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  try {
    const floor = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -.1, 0));
    world.createCollider(RAPIER.ColliderDesc.cuboid(20, .1, 20), floor);
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setLinearDamping(1.8).setAngularDamping(.65).enabledRotations(true, false, true).setCcdEnabled(true));
    world.createCollider(RAPIER.ColliderDesc.capsule(.65, .28).setTranslation(0, .94, 0).setMass(CHARACTER_MASS).setFriction(.7), body);
    const up = () => { const q = body.rotation(); return new Vector3(0, 1, 0).applyQuaternion(new Quaternion(q.x, q.y, q.z, q.w)); };
    const step = (count: number, recovering: boolean) => {
      for (let i = 0; i < count; i++) { if (recovering) steadyCharacter(body, world.timestep); world.step(); }
    };
    step(60, true);
    kickCharacter(body, [7.2, .4, 0], 1.6);
    assert.ok(body.linvel().x > 1);
    step(18, false);
    assert.ok(body.worldCom().x > .1, `recoil COM: ${body.worldCom().x}`);
    assert.ok(Math.abs(up().x) > .01);
    step(240, true);
    assert.ok(up().y > .9, `living character must recover: ${up().y}`);
    for (let hit = 0; hit < 3; hit++) {
      kickCharacter(body, [7.2, .12, 0], bat.knockback, true);
      step(Math.round(CHARACTER_RECOVER_DELAY / 1000 / world.timestep), false);
      assert.ok(up().y < .4, `bat hit ${hit + 1} must knock the character down`);
      step(240, true);
      assert.ok(up().y > .9, 'a living character gets up after each bat hit');
    }
    const health = new CharacterHealth();
    for (let i = 0; i < 24; i++) assert.equal(health.hit(bat.power), false);
    assert.equal(health.hit(bat.power), true);
    kickCharacter(body, [0, 0, 0], 1.6, health.gone);
    step(120, false);
    assert.ok(up().y < .4, `final hit must topple the body: ${up().y}`);
    assert.ok(CHARACTER_EXIT_DELAY >= 3000);
    for (const n of Object.values(body.translation())) assert.ok(Number.isFinite(n));
    body.setEnabled(false); step(2, false);
    assert.equal(body.isEnabled(), false);
  } finally { world.free(); }
});

test('repeated strong hits have bounded launch speed', async () => {
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  try {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic());
    world.createCollider(RAPIER.ColliderDesc.capsule(.65, .28).setMass(CHARACTER_MASS), body);
    for (let i = 0; i < 50; i++) kickCharacter(body, [1000, 1000, -1000], 100, true);
    const v = body.linvel();
    assert.ok(Math.hypot(v.x, v.z) <= 4.80001);
    assert.ok(v.y <= 1.80001);
  } finally { world.free(); }
});
