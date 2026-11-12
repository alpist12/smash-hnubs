import { Vector3 } from 'three';
import { WEAPONS, type WeaponId } from '../weapons/config';
import { useGame } from '../game/store';
import { playImpact } from '../game/audio';
import type { V3 } from '../data/types';

export interface Target { point: () => Vector3; hit: (damage: number, impulse: V3, point: V3, maxSpeed?: number, fromContact?: boolean) => void }
export const targets = new Map<string, Target>();
export const aim = { point: [0, .78, .4] as V3, target: '', holding: false, last: -10, shake: 0, camera: [8, 8.5, 10.5] as V3, normal: [0, 1, 0] as V3 };
let serial = 0;
let bombs: { at: number; point: V3; round: number }[] = [];
let missiles: { at: number; point: V3; round: number; target: string }[] = [];
export const nextEffectId = () => ++serial;
export function falloff(distance: number, radius: number) { return Math.max(0, 1 - distance / radius); }

function detonate(weapon: WeaponId, point: V3, selected: string) {
  const config = WEAPONS[weapon], state = useGame.getState(), center = new Vector3(...point);
  for (const [id, target] of targets) {
    const position = target.point(), distance = position.distanceTo(center);
    const strength = id === selected ? 1 : falloff(distance, config.radius);
    if (strength <= 0) continue;
    // 무기마다 위로 띄우는 정도와 최대 밀려나는 속도를 다르게 한다 (배트는 낮고 짧게).
    const dir = position.sub(center); dir.y = Math.max(config.lift, dir.y * .5 + config.lift); dir.normalize();
    target.hit(config.power * strength, dir.multiplyScalar(config.impulse * strength).toArray() as V3, point, config.knockback * Math.max(.35, strength));
  }
  state.addEffect({ id: nextEffectId(), type: weapon, point, born: performance.now(), radius: config.radius });
  aim.shake = weapon === 'bomb' ? .2 : weapon === 'missile' ? .17 : weapon === 'sonic' ? .12 : .035;
  if (state.sound) playImpact(weapon);
}
export function attack(point: V3, selected = '') {
  const state = useGame.getState(), now = performance.now() / 1000;
  if (!state.ready || now - aim.last < WEAPONS[state.weapon].cooldown) return;
  aim.last = now;
  if (state.weapon === 'bomb') {
    bombs.push({ at: now + .8, point: [...point], round: state.round });
    state.addEffect({ id: nextEffectId(), type: 'fuse', point, born: performance.now(), radius: .12 });
  } else if (state.weapon === 'missile') {
    // 카메라 오른쪽 아래에서 발사해 포물선을 그리며 날아간다.
    const target = new Vector3(...point), camera = new Vector3(...aim.camera);
    const from = camera.clone().lerp(target, .12).add(new Vector3(.6, -.9, 0));
    const flight = Math.min(.95, Math.max(.35, from.distanceTo(target) / 17));
    missiles.push({ at: now + flight, point: [...point], round: state.round, target: selected });
    state.addEffect({ id: nextEffectId(), type: 'rocket', point, from: from.toArray() as V3, born: performance.now(), radius: .1, duration: flight });
    if (state.sound) playImpact('launch');
  } else detonate(state.weapon, point, selected);
}
export function tickAttacks() {
  const now = performance.now() / 1000, state = useGame.getState();
  bombs = bombs.filter(bomb => {
    if (bomb.round !== state.round) return false;
    if (now < bomb.at) return true;
    detonate('bomb', bomb.point, ''); return false;
  });
  missiles = missiles.filter(missile => {
    if (missile.round !== state.round) return false;
    if (now < missile.at) return true;
    detonate('missile', missile.point, missile.target); return false;
  });
  if (aim.holding && state.weapon === 'laser') attack(aim.point, aim.target);
}
export function clearAttacks() { bombs = []; missiles = []; aim.holding = false; aim.last = -10; aim.shake = 0; }
