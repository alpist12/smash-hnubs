import {CHARACTERS, type WanderStyle} from '../src/data/characters';
import test from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { CharacterWander, nextPatrolStop, nextWanderGoal } from '../src/physics/characterWander';
import { kickCharacter, steadyCharacter, CHARACTER_MASS } from '../src/physics/characterMotion';
import { WORLD } from '../src/data/studios';

const TRANSIT:WanderStyle={...CHARACTERS[0].wander,speed:.8,startDelay:[100,100],firstRoomMs:0,pause:[700,1900],stayChance:0,stops:[{x:-3.6,z:1.8},{x:.8,z:-7.1},{x:-3.7,z:-13.2}],roomWeights:[[0,1,1],[1,0,1],[1,1,0]]};

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
    const wander = new CharacterWander(() => .5,TRANSIT); wander.heading = 0;
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
    const walkers=[new CharacterWander(()=>.1,TRANSIT),new CharacterWander(()=>.2,TRANSIT)];walkers[0].heading=Math.PI;walkers[1].heading=0;
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

test('each person has separate startup, pace, pauses and random room preferences',()=>{
 const [wonjae,yujin]=CHARACTERS.map(p=>p.wander),position={x:-3.6,z:1.8};
 assert.ok(wonjae.startDelay[1]<yujin.startDelay[0]);assert.ok(wonjae.speed<yujin.speed);assert.ok(wonjae.pause[0]>yujin.pause[0]);
 for(const style of [wonjae,yujin])for(const value of [0,.2,.5,.99]){
  const local=nextWanderGoal(position,style.firstRoomMs-1,style,()=>value);assert.ok(local.z> -4.5&&local.z<4.5);
 }
 assert.ok(nextWanderGoal(position,20000,wonjae,()=>.9).z>-4.5);
 assert.ok(nextWanderGoal(position,20000,yujin,()=>.9).z<-10);
 assert.notDeepEqual(nextWanderGoal(position,60000,wonjae,()=>.5),nextWanderGoal(position,60000,yujin,()=>.5));
});
test('real character styles start at separate times and roam the main room before visiting booths',async()=>{
 await RAPIER.init();const world=new RAPIER.World({x:0,y:-9.81,z:0});
 try{
  const floor=world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0,-.12,-5.75));world.createCollider(RAPIER.ColliderDesc.cuboid(7,.12,10.25),floor);
  const actors=CHARACTERS.map(profile=>{const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(...profile.pos).enabledRotations(false,false,false).setLinearDamping(1.8));world.createCollider(RAPIER.ColliderDesc.capsule(.65,.28).setTranslation(0,.94,0).setMass(CHARACTER_MASS).setFriction(.7),body);return body;});
  const walkers=CHARACTERS.map((profile,index)=>{let seed=12345+index*7919;return new CharacterWander(()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32),profile.wander);});
  const first=[Infinity,Infinity],travel=[0,0],maxSpeed=[0,0],old=actors.map(b=>b.translation());
  for(let i=0;i<2400;i++){
   const now=i*1000/60;walkers.forEach((walker,k)=>walker.step(world,actors[k],world.timestep,now,true));world.step();
   actors.forEach((body,k)=>{const p=body.translation(),v=body.linvel(),speed=Math.hypot(v.x,v.z);if(speed>.1)first[k]=Math.min(first[k],now);maxSpeed[k]=Math.max(maxSpeed[k],speed);travel[k]+=Math.hypot(p.x-old[k].x,p.z-old[k].z);old[k]=p;if(now<CHARACTERS[k].wander.firstRoomMs)assert.ok(p.z>-4.5,'must not immediately enter a booth');});
  }
  assert.ok(first[0]>=3500&&first[0]<7500,JSON.stringify(first));assert.ok(first[1]>=7500&&first[1]>first[0]+1000,JSON.stringify(first));
  assert.ok(travel.every(n=>n>4),JSON.stringify(travel));assert.ok(maxSpeed[1]>maxSpeed[0]+.1,JSON.stringify(maxSpeed));
 }finally{world.free();}
});

test('even with identical random values the two people choose different rooms and different destinations',()=>{
 const [wonjae,yujin]=CHARACTERS.map(p=>p.wander);
 const room=(z:number)=>z<-10?2:z<-4.5?1:0;
 const a=nextPatrolStop(0,()=>.5,wonjae),b=nextPatrolStop(0,()=>.5,yujin);
 assert.equal(room(a.z),1);assert.equal(room(b.z),2);
 for(const z of [1,-7,-13])assert.notDeepEqual(nextWanderGoal({x:0,z},0,wonjae,()=>.5),nextWanderGoal({x:0,z},0,yujin,()=>.5));
 let seed=491;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
 const techVisits=[0,0];for(let i=0;i<1000;i++){techVisits[0]+=Number(room(nextPatrolStop(0,random,wonjae).z)===1);techVisits[1]+=Number(room(nextPatrolStop(0,random,yujin).z)===1);}
 assert.ok(techVisits[0]>600&&techVisits[0]<700&&techVisits[1]>300&&techVisits[1]<400,JSON.stringify(techVisits));
});

test('preferred room pairs get exactly sixty-five percent of each departure in both directions',()=>{
 const [wonjae,yujin]=CHARACTERS.map(p=>p.wander);const room=(z:number)=>z<-10?2:z<-4.5?1:0;
 for(const [style,from,preferred] of [[wonjae,0,1],[wonjae,-7,0],[yujin,0,2],[yujin,-13,0]] as const){
  let matches=0;for(let i=0;i<100;i++){let calls=0;matches+=Number(room(nextPatrolStop(from,()=>calls++===0?(i+.5)/100:.5,style).z)===preferred);}
  assert.equal(matches,65,`${from} -> ${preferred}`);
 }
});
