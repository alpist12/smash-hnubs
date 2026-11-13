import test from 'node:test';
import assert from 'node:assert/strict';
import { CharacterGait } from '../src/scene/characterGait';

test('gait bends knees, lifts swing feet, keeps soles level and eases to a neutral stop', () => {
  const gait = new CharacterGait(); let lifts = 0, stance = 0;
  for (let i=0;i<240;i++) {
    gait.step(.7,1/60);
    for (let side=0;side<2;side++) {
      const leg=gait.leg(side);
      assert.ok([leg.hip,leg.knee,leg.ankle].every(Number.isFinite));
      assert.ok(leg.knee >= 0 && leg.knee < 1.5);
      assert.ok(Math.abs(leg.hip+leg.knee+leg.ankle)<1e-8);
      const ankleY=.83+gait.bob-.36*Math.cos(leg.hip)-.36*Math.cos(leg.hip+leg.knee);
      assert.ok(ankleY > .08, `foot must not sink through the floor: ${ankleY}`);
      if(leg.lift>.04) lifts++;
      if(leg.lift<1e-6) stance++;
    }
  }
  assert.ok(lifts>20 && stance>100);
  for(let i=0;i<120;i++) gait.step(0,1/60);
  assert.ok(gait.blend<1e-6 && Math.abs(gait.bob)<1e-6);
  assert.ok(Math.abs(gait.leg(0).hip)<1e-6);
});
