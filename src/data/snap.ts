import snap from '../weapons/snap';
import type { V3 } from './types';
import { WORLD } from './studios';
export interface SnapStrike { id: number; point: V3; born: number; yaw: number; fired: boolean }
/** 무작위로 절반(홀수면 올림)을 골라, 사라질 시각(스냅 뒤 0~vanish초)을 붙인다. */
export function pickHalf<T>(list: T[], random = Math.random) {
  const shuffled = [...list];
  for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
  return shuffled.slice(0, Math.ceil(list.length / 2)).map(item => ({ item, at: random() * snap.vanish }));
}
const smooth = (n: number) => { const t = Math.max(0, Math.min(1, n)); return t * t * (3 - 2 * t); };
/** 스냅 전에는 타노스 얼굴·손을 가깝게, 스냅 뒤에는 방송국 전체가 보이게 물러난다. */
export function snapFrame(age: number, strike: SnapStrike, portrait = false) {
  const [x, , z] = strike.point, s = Math.sin(strike.yaw), c = Math.cos(strike.yaw), range = portrait ? 4.6 : 3.4;
  // 타노스 기준 좌표(오른쪽 lx, 앞 lz)를 월드로 옮긴다.
  const at = (lx: number, y: number, lz: number): V3 => [x + lx * c + lz * s, y, z - lx * s + lz * c];
  // 포털이 지나가는 동안은 전신, 손가락을 맞댈 때는 엄지 쪽 옆에서 건틀릿을 크게 잡는다(그래야 튕기는 손가락이 보인다).
  const hand = smooth((age - snap.snapAt + 1.7) / 1.0);
  const body = at(.6, 1.75, range), bodyTarget = at(0, 1.4, 0), side = at(1.55, 2.12, 1.05), handTarget = at(.5, 2.02, .42);
  const close = body.map((v, i) => v + (side[i] - v) * hand) as V3, closeTarget = bodyTarget.map((v, i) => v + (handTarget[i] - v) * hand) as V3;
  const wide: V3 = [x * .3 + 9, 13, WORLD.centerZ + (portrait ? 26 : 17)], wideTarget: V3 = [0, .6, WORLD.centerZ];
  const t = smooth((age - snap.snapAt - .35) / 1.4);
  return { camera: close.map((v, i) => v + (wide[i] - v) * t) as V3, target: closeTarget.map((v, i) => v + (wideTarget[i] - v) * t) as V3 };
}
