import test from 'node:test';
import assert from 'node:assert/strict';
import {playImpact,stopNuclear,stopRayquaza} from '../src/game/audio';
test('nuclear audio schedules three warning beeps and cancels flight and blast sources',()=>{
 const sources:{frequency?:{value:number;setValueAtTime:(n:number)=>void;exponentialRampToValueAtTime:()=>void};starts:number[];stops:(number|undefined)[];connect:()=>void;start:(t:number)=>void;stop:(t?:number)=>void}[]=[];
 const param=()=>({value:0,setValueAtTime(n:number){this.value=n;},exponentialRampToValueAtTime(){}});
 function source(osc=false){const s={...(osc?{frequency:param()}:{}),starts:[] as number[],stops:[] as (number|undefined)[],connect(){},start(t:number){this.starts.push(t);},stop(t?:number){this.stops.push(t);}};sources.push(s);return s;}
 class Context{currentTime=0;sampleRate=100;state='running';destination={};createDynamicsCompressor(){return {threshold:param(),ratio:param(),connect(){}};}createGain(){return {gain:param(),connect(){}};}createBuffer(_channels:number,length:number){return {getChannelData:()=>new Float32Array(length)};}createBiquadFilter(){return {Q:param(),frequency:param(),connect(){}};}createOscillator(){return source(true);}createBufferSource(){return source();}}
 const previous=Object.getOwnPropertyDescriptor(globalThis,'AudioContext');Object.defineProperty(globalThis,'AudioContext',{configurable:true,value:Context});
 try{playImpact('nuke-arm');const beeps=sources.filter(s=>s.frequency?.value===880);assert.equal(beeps.length,3);assert.deepEqual(beeps.map(s=>s.starts[0]),[0,.9,1.8]);const flight=[...sources];playImpact('nuke');assert.ok(flight.every(s=>s.stops.includes(undefined)));stopNuclear();assert.ok(sources.every(s=>s.stops.includes(undefined)));for(let i=0;i<15;i++)playImpact('bat');const count=sources.length;playImpact('rayquaza-draco');assert.ok(sources.length-count>=12);assert.ok(sources.slice(count).some(source=>source.starts[0]===10.4));stopRayquaza();assert.ok(sources.slice(count).every(s=>s.stops.includes(undefined)));}finally{if(previous)Object.defineProperty(globalThis,'AudioContext',previous);else Reflect.deleteProperty(globalThis,'AudioContext');}
});
