import type { RigidBody } from '@dimforge/rapier3d-compat';
import { Quaternion, Vector3 } from 'three';
import type { V3 } from '../data/types';

export const CHARACTER_MASS = 70;
export const CHARACTER_EXIT_DELAY = 4000;
export const CHARACTER_RECOVER_DELAY = 1500;
const up = new Vector3(), rotation = new Quaternion();

export function kickCharacter(body: RigidBody, impulse: V3, maxSpeed = 1.6, fallen = false) {
  const direction = new Vector3(impulse[0], 0, impulse[2]);
  if (direction.lengthSq() < 1e-6) direction.set(0, 0, 1);
  direction.normalize();
  const speed = Math.min(4, Math.max(.6, maxSpeed * .75)) * (fallen ? 1.2 : 1);
  const current = body.linvel();
  const velocity = new Vector3(current.x + direction.x * speed, 0, current.z + direction.z * speed).clampLength(0, 4.8);
  velocity.y = Math.min(1.8, Math.max(current.y, 0) + (fallen ? .8 : .45) + speed * .15);
  body.setLinvel(velocity, true);
  const spin = fallen ? 3.8 : Math.min(2.2, .8 + speed * .35);
  body.setAngvel({ x: direction.z * spin, y: 0, z: -direction.x * spin }, true);
}

// A spring keeps a living character upright; the final hit releases it completely.
export function steadyCharacter(body: RigidBody, delta: number, recovering = true) {
  const q = body.rotation(), omega = body.angvel();
  up.set(0, 1, 0).applyQuaternion(rotation.set(q.x, q.y, q.z, q.w));
  const spring = recovering ? 1600 : 300, damping = recovering ? 260 : 35;
  body.applyTorqueImpulse({ x: (-up.z * spring - omega.x * damping) * delta, y: -omega.y * 25 * delta, z: (up.x * spring - omega.z * damping) * delta }, false);
}
