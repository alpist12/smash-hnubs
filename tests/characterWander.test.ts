import test from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { CharacterWander, nextPatrolStop } from '../src/physics/characterWander';
import { kickCharacter, steadyCharacter, CHARACTER_MASS } from '../src/physics/characterMotion';
import { WORLD } from '../src/data/studios';

test('wandering walks around a live collider, turns at room bounds, and pauses without cancelling hits', async () => {
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  try {
    const floor = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -.1, -5.75));
    world.createCollider(RAPIER.ColliderDesc.cuboid(7, .1, 10.25), floor);
    const wall = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 1, 1.2));
    world.createCollider(RAPIER.ColliderDesc.cuboid(1, 1, .1), wall);
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setLinearDamping(1.8).setAngularDamping(.65).enabledRotations(true, false, true).setCcdEnabled(true));
    world.createCollider(RAPIER.ColliderDesc.capsule(.65, .28).setTranslation(0, .94, 0).setMass(CHARACTER_MASS).setFriction(.7), body);
    for (let i = 0; i < 60; i++) world.step();
    const wander = new CharacterWander(() => .5); wander.heading = 0;
    let travel = 0, old = body.translation(), passedObstacle = false;
    for (let i = 0; i < 2400; i++) {
      const q = body.rotation(), v = body.linvel();
      wander.step(world, body, world.timestep, i * 1000 / 60, 1 - 2 * (q.x*q.x + q.z*q.z) > .9 && Math.abs(v.y) < .4);
      steadyCharacter(body, world.timestep); world.step();
      const p = body.translation(); travel += Math.hypot(p.x - old.x, p.z - old.z); old = p;
      assert.ok(Math.abs(p.x) < WORLD.width / 2 - .25);
      assert.ok(p.z > WORLD.minZ + .25 && p.z < WORLD.maxZ - .25);
      if (p.z < -2) passedObstacle = true;
      assert.ok(!(Math.abs(p.x) < 1 && Math.abs(p.z - 1.2) < .12), 'must not walk through a wall');
    }
    assert.ok(travel > 8, `must roam rather than remain stuck: ${travel}`);
    assert.ok(passedObstacle, 'must travel toward another room');
    kickCharacter(body, [7, 0, 0]); const kicked = body.linvel();
    wander.step(world, body, world.timestep, 50000, false);
    assert.equal(wander.speed, 0); assert.deepEqual(body.linvel(), kicked);
    world.removeRigidBody(wall); world.step();
    wander.step(world, body, world.timestep, 52000, true);
    assert.ok(Number.isFinite(wander.heading));
  } finally { world.free(); }
});


test('next room and destination vary randomly rather than following a fixed patrol order', () => {
  const room = (z:number) => z < -10 ? 'announcer' : z < -4.5 ? 'technical' : 'main';
  for (const z of [1.8, -7.1, -13.2]) {
    const first = nextPatrolStop(z,()=>0), second = nextPatrolStop(z,()=>.99);
    assert.notEqual(room(first.z), room(z)); assert.notEqual(room(second.z),room(z));
    assert.notEqual(room(first.z),room(second.z));
  }
  let count=0;
  const a=nextPatrolStop(0,()=>count++===0?0:.1);
  count=0;
  const b=nextPatrolStop(0,()=>count++===0?0:.9);
  assert.equal(room(a.z),room(b.z)); assert.notDeepEqual(a,b);
});


test('two characters make space and pass a narrow doorway without merging physics bodies', async () => {
  await RAPIER.init(); const world=new RAPIER.World({x:0,y:-9.81,z:0});
  try {
    const floor=world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0,-.12,-5.75));
    world.createCollider(RAPIER.ColliderDesc.cuboid(7,.12,10.25),floor);
    for(const z of [-4.5,-10])for(const [x,width] of [[-5.95,2.1],[1.575,10.85]]) {
      const wall=world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x,1.4,z));
      world.createCollider(RAPIER.ColliderDesc.cuboid(width/2,1.4,.055),wall);
    }
    const actors=[-3.4,-5.6].map(z=>{
      const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(-4.375,0,z).enabledRotations(false,false,false).setLinearDamping(1.8).setCcdEnabled(true));
      world.createCollider(RAPIER.ColliderDesc.capsule(.65,.28).setTranslation(0,.94,0).setMass(CHARACTER_MASS).setFriction(.7),body);return body;
    });
    const walkers=[new CharacterWander(()=>.1),new CharacterWander(()=>.2)];walkers[0].heading=Math.PI;walkers[1].heading=0;
    const crossed=[false,false];
    for(let i=0;i<7200;i++) {
      for(let k=0;k<2;k++)walkers[k].step(world,actors[k],world.timestep,i*1000/60,true);
      world.step();
      if(actors[0].translation().z<-5.7)crossed[0]=true;
      if(actors[1].translation().z>-3.3)crossed[1]=true;
      if(crossed.every(Boolean))break;
    }
    assert.deepEqual(crossed,[true,true],actors.map(b=>JSON.stringify(b.translation())).join(','));
  } finally {world.free();}
});
