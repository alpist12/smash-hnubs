import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3} from 'three';
import {attack,clearAttacks,targets,tickAttacks} from '../src/physics/attacks';
import {useGame} from '../src/game/store';
import {WEAPONS,damageGuideRadius} from '../src/weapons/config';
import {dracoPoint,dracoMeteor,rayquazaFrame} from '../src/data/rayquaza';
test('Rayquaza file embeds textures, animation clips and author attribution',()=>{
 const bytes=readFileSync('public/models/rayquaza/rayquaza.glb');assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(8),bytes.length);
 const data=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 assert.equal(data.asset.extras.author,'Master Galanodel (https://sketchfab.com/Master_Galanodel)');assert.match(data.asset.extras.license,/CC-BY-4.0/);
 for(const name of ['animation.rayquaza.idle','animation.rayquaza.fly','animation.rayquaza.attack_1','animation.rayquaza.attack_2'])assert.ok(data.animations.some((a:{name:string})=>a.name===name));
 assert.ok(data.images.every((image:{bufferView?:number;uri?:string})=>image.bufferView!==undefined&&!image.uri));assert.ok(bytes.length<1000000);
});
test('Draco Meteor lands twelve scheduled blasts, bounds catch-up work and cancels on reset',()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'performance')!;let now=10000;
 Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>now}});
 try{
  clearAttacks();targets.clear();useGame.getState().reset();useGame.setState({ready:true,sound:false,weapon:'draco',quality:'low'});
  const point:[number,number,number]=[0,0,0],hits=new Set<number>();
  for(let i=0;i<WEAPONS.draco.count;i++)targets.set('rock-'+i,{point:()=>new Vector3(...dracoPoint(point,i)),hit:(_damage,_impulse,_point,_speed,contact,weapon)=>{assert.equal(weapon,'draco');assert.equal(contact,false);hits.add(i);}});
  targets.set('outside',{point:()=>new Vector3(100,0,100),hit:()=>assert.fail('outside area')});
  attack(point,'rock-0');assert.equal(useGame.getState().rayquaza?.hits,0);assert.equal(hits.size,0);
  now+=WEAPONS.draco.firstImpact*1000-1;tickAttacks();assert.equal(hits.size,0);
  now++;tickAttacks();assert.equal(useGame.getState().rayquaza?.hits,1);assert.ok(hits.has(0));
  now+=4000;tickAttacks();assert.equal(useGame.getState().rayquaza?.hits,3);
  for(let i=0;i<10;i++)tickAttacks();assert.equal(useGame.getState().rayquaza?.hits,12);assert.equal(hits.size,12);
  const effects=useGame.getState().effects.length;tickAttacks();assert.equal(useGame.getState().effects.length,effects);
  now+=1000;tickAttacks();assert.equal(useGame.getState().rayquaza,null);
  clearAttacks();attack(point);useGame.getState().reset();const oldHits=hits.size;now+=20000;tickAttacks();assert.equal(hits.size,oldHits);assert.equal(useGame.getState().effects.length,0);
 }finally{targets.clear();clearAttacks();Object.defineProperty(globalThis,'performance',original);}
});
test('Dragon Ascent only damages at impact once and blocks overlapping cinematics',()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'performance')!;let now=10000;
 Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>now}});
 try{
  clearAttacks();targets.clear();useGame.getState().reset();useGame.setState({ready:true,sound:false,weapon:'ascent'});let hits=0;
  targets.set('center',{point:()=>new Vector3(),hit:damage=>{hits++;assert.equal(damage,WEAPONS.ascent.power);}});
  attack([0,0,0]);useGame.getState().select('nuke');now+=1000;attack([0,0,0]);assert.equal(useGame.getState().nuke,null);
  now+=WEAPONS.ascent.impact*1000-1001;tickAttacks();assert.equal(hits,0);now++;tickAttacks();assert.equal(hits,1);tickAttacks();assert.equal(hits,1);
  useGame.getState().reset();assert.equal(useGame.getState().rayquaza,null);
 }finally{targets.clear();clearAttacks();Object.defineProperty(globalThis,'performance',original);}
});
test('meteor trajectories end at their blast centers; dive and camera stay continuous',()=>{
 const point:[number,number,number]=[0,0,-7];
 for(let i=0;i<WEAPONS.draco.count;i++){
  const p=dracoPoint(point,i);assert.ok(Math.hypot(p[0]-point[0],p[2]-point[2])<=WEAPONS.draco.spread+1e-8);
  assert.ok(new Vector3(...dracoMeteor(point,i,WEAPONS.draco.firstImpact+i*WEAPONS.draco.interval).position).distanceTo(new Vector3(...p))<1e-7);
 }
 assert.equal(damageGuideRadius('draco'),WEAPONS.draco.spread+WEAPONS.draco.radius);
 for(const skill of ['draco','ascent'] as const){let previous=rayquazaFrame(0,skill,point);for(let age=.01;age<7;age+=.01){const next=rayquazaFrame(age,skill,point);assert.ok([...next.position,...next.camera,...next.target].every(Number.isFinite));assert.ok(new Vector3(...previous.position).distanceTo(new Vector3(...next.position))<1);previous=next;}}
 assert.ok(rayquazaFrame(3.79,'ascent',point).position[1]<point[1]+1);
});
