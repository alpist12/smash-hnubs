import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { useGame } from '../src/game/store';
import { aim, attack, clearAttacks, targets, tickAttacks } from '../src/physics/attacks';
import { meteorPosition, meteorProgress } from '../src/data/meteor';
import meteor from '../src/weapons/meteor';

test('meteor warns first, hits once at landing, and reset cancels a pending strike', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'performance')!;
  let now=10000;
  Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>now}});
  const hits:number[]=[];
  try {
    clearAttacks(); useGame.getState().reset();
    useGame.setState({ready:true,sound:false,weapon:'meteor'});
    targets.set('center',{point:()=>new Vector3(),hit:amount=>hits.push(amount)});
    targets.set('half',{point:()=>new Vector3(meteor.radius/2,0,0),hit:amount=>hits.push(amount)});
    targets.set('outside',{point:()=>new Vector3(meteor.radius+1,0,0),hit:()=>assert.fail('outside radius')});
    attack([0,0,0],'center');
    const strike=useGame.getState().meteor!;
    assert.ok(strike); assert.equal(strike.impacted,false); assert.deepEqual(hits,[]);
    assert.deepEqual(meteorPosition(strike.point,0),[-5,18,-3]);
    assert.deepEqual(meteorPosition(strike.point,1),[0,0,0]);
    assert.equal(meteorProgress(strike,now),0);
    now+=meteor.flight*1000-1;tickAttacks();assert.deepEqual(hits,[]);
    now++;tickAttacks();assert.deepEqual(hits,[meteor.power,meteor.power/2]);
    assert.equal(useGame.getState().meteor!.impacted,true);
    tickAttacks();assert.equal(hits.length,2);
    now+=meteor.aftermath*1000+1;tickAttacks();assert.equal(useGame.getState().meteor,null);
    clearAttacks();attack([0,0,0],'center');assert.ok(useGame.getState().meteor);
    useGame.getState().reset();now+=10000;tickAttacks();assert.equal(hits.length,2);
    assert.equal(useGame.getState().meteor,null);
    clearAttacks();aim.last=-10;attack([0,0,0],'center');clearAttacks();now+=10000;tickAttacks();assert.equal(hits.length,2);
  } finally {
    targets.clear();clearAttacks();Object.defineProperty(globalThis,'performance',original);
  }
});
