import { dracoPoint } from '../data/rayquaza';
import { beginOnlineRun } from '../game/leaderboard';
import { Vector3 } from 'three';
import { WEAPONS, type WeaponId } from '../weapons/config';
import { useGame } from '../game/store';
import { audioContext, playImpact, stopMeteorFall, stopNuclear, stopRayquaza } from '../game/audio';
import type { V3 } from '../data/types';

export interface Target { point: () => Vector3; facing?: () => number; hit: (damage: number, impulse: V3, point: V3, maxSpeed?: number, fromContact?: boolean, weapon?: WeaponId) => void }
export const targets = new Map<string, Target>();
export const aim = { active: false, point: [0, .78, .4] as V3, target: '', holding: false, last: -10, shake: 0, kick: 0, camera: [8, 8.5, 10.5] as V3, normal: [0, 1, 0] as V3 };
let serial = 0;
const lastShots = new Map<WeaponId, number>();
let shotRound = -1;
let nukeTargets: [string, Target][] = [];
let nukeRound = -1;
let bombs: { at: number; point: V3; round: number }[] = [];
let missiles: { at: number; point: V3; round: number; target: string }[] = [];
export const nextEffectId = () => ++serial;
export function falloff(distance: number, radius: number) { return Math.max(0, 1 - distance / radius); }

function detonate(weapon: WeaponId, point: V3, selected: string) {
  const config = WEAPONS[weapon], state = useGame.getState(), center = new Vector3(...point);
  for (const [id, target] of targets) {
    if (weapon === 'bat' && id !== selected) continue;
    const position = target.point(), distance = position.distanceTo(center);
    const strength = id === selected ? 1 : falloff(distance, config.radius);
    if (strength <= 0) continue;
    // 무기마다 위로 띄우는 정도와 최대 밀려나는 속도를 다르게 한다 (배트는 낮고 짧게).
    const dir = position.sub(center); dir.y = Math.max(config.lift, dir.y * .5 + config.lift); dir.normalize();
    target.hit(config.power * strength, dir.multiplyScalar(config.impulse * strength).toArray() as V3, point, config.knockback * Math.max(.35, strength), false, weapon);
  }
  state.addEffect({ id: nextEffectId(), type: weapon, point, born: performance.now(), radius: config.radius });
  aim.kick = weapon === 'ascent' ? 12 : weapon === 'meteor' ? 10 : weapon === 'draco' ? 4 : 0;
  aim.shake = weapon === 'ascent' ? .8 : weapon === 'draco' ? .3 : weapon === 'meteor' ? .85 : weapon === 'bomb' ? .2 : weapon === 'missile' ? .17 : weapon === 'sonic' ? .12 : .035;
  if (state.sound) playImpact(weapon);
}
export function attack(point: V3, selected = '') {
  const state = useGame.getState(), now = performance.now() / 1000;
  if (!state.ready) return;
  if (shotRound !== state.round) { lastShots.clear(); shotRound = state.round; }
  if (state.rayquaza || state.nuke || ((state.weapon === 'draco' || state.weapon === 'ascent') && state.meteor) || (state.weapon === 'meteor' || state.weapon === 'nuke') && state.meteor) return;
  const wait = WEAPONS[state.weapon].cooldown - (now - (lastShots.get(state.weapon) ?? -Infinity));
  if (wait > 0) {
    if (['meteor','nuke','draco','ascent'].includes(state.weapon)) useGame.setState({ hint: `${WEAPONS[state.weapon].short} 재사용까지 ${wait.toFixed(1)}초` });
    return;
  }
  lastShots.set(state.weapon, now);
  aim.last = now;
  beginOnlineRun(state.round, state.weapon === 'nuke');
  if (state.sound) audioContext(); // 지연 폭발도 모바일 사용자 제스처 안에서 오디오를 연다.
  if (state.weapon === 'draco' || state.weapon === 'ascent') {
    useGame.setState({rayquaza:{id:nextEffectId(),point:[...point],born:now*1000,skill:state.weapon,hits:0}});
    if(state.sound)playImpact(`rayquaza-${state.weapon}`);
  } else if (state.weapon === 'nuke') {
    useGame.setState({ nuke: { id: nextEffectId(), point: [0, 0, -5.75], born: now * 1000, impacted: false }, usedNuke: true, hint: '' });
    if (state.sound) playImpact('nuke-arm');
  } else if (state.weapon === 'meteor') {
    useGame.setState({ meteor: { id: nextEffectId(), point: [...point], born: now * 1000, impacted: false } });
    if (state.sound) playImpact('meteor-fall');
  } else if (state.weapon === 'bomb') {
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
  const dragon=state.rayquaza;
  if(dragon){
    const age=now-dragon.born/1000,config=WEAPONS[dragon.skill];let hits=dragon.hits;
    if(dragon.skill==='draco'){
      const due=Math.min(WEAPONS.draco.count,Math.max(0,Math.floor((age-WEAPONS.draco.firstImpact)/WEAPONS.draco.interval+1+1e-7)));
      const end=Math.min(due,hits+2);
      while(hits<end){detonate('draco',dracoPoint(dragon.point,hits),'');hits++;}
    }else if(!hits&&age>=WEAPONS.ascent.impact){detonate('ascent',dragon.point,'');hits=1;}
    const total=dragon.skill==='draco'?WEAPONS.draco.count:1;
    if(hits!==dragon.hits)useGame.setState({rayquaza:{...dragon,hits}});
    if(age>=config.duration&&hits===total)useGame.setState({rayquaza:null});
  }
  const nuclear = state.nuke;
  if (nukeRound !== state.round) { nukeTargets = []; nukeRound = state.round; }
  if (nuclear && !nuclear.impacted && now * 1000 >= nuclear.born + WEAPONS.nuke.charge * 1000) {
    nukeTargets = [...targets];
    useGame.setState({ nuke: { ...nuclear, impacted: true }, usedNuke: true });
    aim.shake = 1.1; aim.kick = 14;
    if (state.sound) playImpact('nuke');
  }
  if (nuclear?.impacted || nukeTargets.length) {
    // Spread expensive mesh replacement across frames while the cloud covers the room.
    const count = state.quality === 'low' ? 8 : 16;
    for (let i = 0; i < count && nukeTargets.length; i++) {
      const [id, target] = nukeTargets.shift()!;
      if (targets.get(id) !== target) continue;
      const p = target.point(), direction = p.clone().sub(new Vector3(0, 0, -5.75));
      direction.y = Math.max(2, direction.y); direction.normalize().multiplyScalar(WEAPONS.nuke.impulse);
      target.hit(WEAPONS.nuke.power, direction.toArray() as V3, p.toArray() as V3, WEAPONS.nuke.knockback, false, 'nuke');
    }
  }
  if (nuclear && !nukeTargets.length && now * 1000 >= nuclear.born + (WEAPONS.nuke.charge + WEAPONS.nuke.aftermath) * 1000) useGame.setState({ nuke: null });
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
  const strike = state.meteor;
  if (strike && !strike.impacted && now * 1000 >= strike.born + WEAPONS.meteor.flight * 1000) {
    useGame.setState({ meteor: { ...strike, impacted: true } });
    stopMeteorFall();
    detonate('meteor', strike.point, '');
  }
  if (strike && now * 1000 >= strike.born + (WEAPONS.meteor.flight + WEAPONS.meteor.aftermath) * 1000) useGame.setState({ meteor: null });
  if (aim.holding && state.weapon === 'laser') attack(aim.point, aim.target);
}
export function clearAttacks() { lastShots.clear(); shotRound = -1; nukeTargets = []; nukeRound = -1; stopMeteorFall(); stopNuclear(); stopRayquaza(); useGame.setState({ rayquaza: null, meteor: null, nuke: null }); bombs = []; missiles = []; aim.active = false; aim.holding = false; aim.last = -10; aim.shake = 0; aim.kick = 0; }
