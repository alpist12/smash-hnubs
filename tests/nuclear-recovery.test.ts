import test from 'node:test';
import assert from 'node:assert/strict';
import {startRecoveryCountdown} from '../src/game/nuclearRecovery';
test('nuclear recovery counts ten seconds, fires once, and cancels on keep/manual restore/unmount',t=>{
 t.mock.timers.enable({apis:['Date','setInterval'],now:1000});
 let remaining=0,restored=0;
 const cancel=startRecoveryCountdown(n=>remaining=n,()=>restored++);
 assert.equal(remaining,10);t.mock.timers.tick(1000);assert.equal(remaining,9);
 t.mock.timers.tick(8750);assert.equal(remaining,1);assert.equal(restored,0);
 t.mock.timers.tick(250);assert.equal(remaining,0);assert.equal(restored,1);
 t.mock.timers.tick(20000);assert.equal(restored,1);cancel();
 const keep=startRecoveryCountdown(n=>remaining=n,()=>restored++);
 t.mock.timers.tick(4000);assert.equal(remaining,6);keep();t.mock.timers.tick(20000);assert.equal(restored,1);
 const manual=startRecoveryCountdown(n=>remaining=n,()=>restored++);manual();restored++;t.mock.timers.tick(20000);assert.equal(restored,2);
});
