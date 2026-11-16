import bat from './bat';
import bomb from './bomb';
import laser from './laser';
import sonic from './sonic';
import missile from './missile';
import meteor from './meteor';
import nuke from './nuke';
export const WEAPONS = { bat, bomb, laser, sonic, missile, meteor, nuke };
export type WeaponId = keyof typeof WEAPONS;

export function damageRangeLabel(weapon: WeaponId) { return weapon === 'bat' ? '선택한 물체 1개' : weapon === 'nuke' ? '방송국 전체' : `피해 반경 ${WEAPONS[weapon].radius}m`; }
