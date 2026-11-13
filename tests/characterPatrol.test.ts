import test from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { Euler, Quaternion } from 'three';
import { ITEMS } from '../src/data/room';
import { model } from '../src/scene/models';
import { initialColliders } from '../src/physics/colliderParts';
import { CharacterWander } from '../src/physics/characterWander';
import { findWalkPath } from '../src/physics/characterNavigation';
import { CHARACTER_MASS } from '../src/physics/characterMotion';

test('patrol crosses both real doorways and raised technical floor with the shipped furniture layout', async () => {
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  try {
    const floor = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -.12, -5.75));
    world.createCollider(RAPIER.ColliderDesc.cuboid(7, .12, 10.25), floor);
    const platform = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(1.59, .06, -7.25));
    world.createCollider(RAPIER.ColliderDesc.cuboid(5.41, .06, 2.75), platform);
    for (const item of ITEMS) {
      const scale = item.scale ?? 1, rotation = new Quaternion().setFromEuler(new Euler(0, item.rotation ?? 0, 0));
      const rb = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(...item.pos).setRotation(rotation));
      for (const part of initialColliders(item, model(item))) {
        const q = new Quaternion().setFromEuler(new Euler(...(part.rotation ?? [0,0,0])));
        world.createCollider(RAPIER.ColliderDesc.cuboid(...part.size.map(n => n * scale / 2) as [number,number,number]).setTranslation(...part.pos.map(n=>n*scale) as [number,number,number]).setRotation(q), rb);
      }
    }
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(-3.6,0,2.5).setLinearDamping(1.8).enabledRotations(false,false,false).setCcdEnabled(true));
    world.createCollider(RAPIER.ColliderDesc.capsule(.65,.28).setTranslation(0,.94,0).setMass(CHARACTER_MASS).setFriction(.7),body);
    for(let i=0;i<30;i++) world.step();
    assert.ok(findWalkPath(world,body,body.translation(),{x:.8,z:-7.1}).length>0, 'a route through the main-to-technical door must exist');
    assert.ok(findWalkPath(world,body,{x:.8,z:-7.1},{x:-3.7,z:-13.2}).length>0, 'a route through the technical-to-announcer door must exist');
    let seed = 271828;
    const wander = new CharacterWander(() => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32));
    let technical = false, announcer = false, returned = false;
    for (let i=0;i<14400;i++) {
      wander.step(world,body,world.timestep,i*1000/60,true); world.step();
      const p=body.translation(), velocity=body.linvel();
      const speed=Math.hypot(velocity.x,velocity.z);
      if(speed>.15) assert.ok((velocity.x*Math.sin(wander.heading)+velocity.z*Math.cos(wander.heading))/speed>.85, 'walking must face the direction of travel');
      if(p.z < -5 && p.z > -9.7 && p.x > -3.7 && p.y > .08) technical=true;
      if(p.z < -11.5) announcer=true;
      if(announcer && p.z > -4) {returned=true;break;}
      assert.ok(Math.abs(p.x)<7 && p.z>-16 && p.z<4.5, `outside room: ${JSON.stringify(p)}`);
      assert.ok(Math.abs(body.rotation().x)<1e-5 && Math.abs(body.rotation().z)<1e-5, 'walking body stays upright');
    }
    assert.ok(technical, `must enter technical platform; ended ${JSON.stringify(body.translation())}`);
    assert.ok(announcer, `must enter announcer booth; ended ${JSON.stringify(body.translation())}`);
    assert.ok(returned, `must return to main room; ended ${JSON.stringify(body.translation())}`);
  } finally {world.free();}
});
