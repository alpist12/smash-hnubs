import {nuclearFrame} from '../src/data/nuclear';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {attack,clearAttacks,tickAttacks,targets} from '../src/physics/attacks';
import {useGame} from '../src/game/store';
import nuke from '../src/weapons/nuke';
import {ITEMS,specs,TOTAL} from '../src/data/room';
test('nuke warns then destroys every room in bounded batches exactly once; reset cancels pending work',()=>{
 const clock=Object.getOwnPropertyDescriptor(globalThis,'performance')!;let now=10000;
 Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>now}});
 try {
  clearAttacks();targets.clear();useGame.getState().reset();useGame.setState({ready:true,sound:false,weapon:'nuke',quality:'low',cameraMode:'home'});
  const hits=new Map<string,number>();
  for(const item of ITEMS)targets.set(item.id,{point:()=>new Vector3(...item.pos),hit:(damage,_i,_p,_s,contact,weapon)=>{assert.equal(weapon,'nuke');assert.equal(contact,false);assert.ok(damage>=specs[item.kind].threshold);hits.set(item.id,(hits.get(item.id)??0)+1);useGame.getState().destroy(item.id,specs[item.kind].score);targets.delete(item.id);}});
  attack([6,0,4]);assert.equal(hits.size,0);assert.ok(useGame.getState().nuke);assert.equal(useGame.getState().cameraMode,'home');
  now+=nuke.charge*1000-1;tickAttacks();assert.equal(hits.size,0);
  now++;tickAttacks();assert.equal(hits.size,8);assert.equal(useGame.getState().usedNuke,true);
  for(let frame=0;frame<100;frame++)tickAttacks();
  assert.equal(hits.size,TOTAL);assert.ok([...hits.values()].every(n=>n===1));
  const score=useGame.getState().score;tickAttacks();assert.equal(useGame.getState().score,score);
  now+=(nuke.aftermath+1)*1000;tickAttacks();assert.equal(useGame.getState().nuke,null);
  clearAttacks();useGame.getState().reset();let count=0;
  for(let i=0;i<30;i++)targets.set('reset-'+i,{point:()=>new Vector3(1000,0,1000),hit:()=>count++});
  attack([0,0,0]);now+=nuke.charge*1000;tickAttacks();assert.equal(count,8);
  useGame.getState().reset();tickAttacks();assert.equal(count,8);assert.equal(useGame.getState().usedNuke,false);
  clearAttacks();attack([0,0,0]);useGame.getState().reset();now+=10000;tickAttacks();assert.equal(count,8);
 }finally{targets.clear();clearAttacks();Object.defineProperty(globalThis,'performance',clock);}
});

test('bomb accelerates into the station, camera pulls back for cloud and portrait framing stays wider',()=>{
 const point:[number,number,number]=[0,0,-5.75];let previous=Infinity;
 for(let age=0;age<=11;age+=.05){const frame=nuclearFrame(age,point);assert.ok([...frame.bomb,...frame.camera,...frame.target].every(Number.isFinite));assert.ok(frame.bomb[1]<=previous);previous=frame.bomb[1];assert.ok(frame.camera[1]>frame.target[1]);}
 const before=nuclearFrame(2.999,point),impact=nuclearFrame(3,point),cloud=nuclearFrame(7,point);
 assert.equal(impact.phase,'impact');assert.deepEqual(impact.bomb,[0,.7,-5.75]);assert.equal(cloud.phase,'cloud');assert.ok(cloud.camera[2]>impact.camera[2]+20);
 assert.ok(new Vector3(...before.camera).distanceTo(new Vector3(...impact.camera))<.1);
 assert.ok(nuclearFrame(7,point,true).camera[2]>cloud.camera[2]);
});
