import draco from './draco';
import ascent from './ascent';
import bat from './bat';
import laser from './laser';
import missile from './missile';
import meteor from './meteor';
import nuke from './nuke';
export const WEAPONS = { bat, laser, missile, meteor, nuke, draco, ascent };
export type WeaponId = keyof typeof WEAPONS;

export function damageRangeLabel(weapon: WeaponId) { return weapon === 'draco' ? `유성우 범위 ${WEAPONS.draco.spread+WEAPONS.draco.radius}m · 개별 폭발 ${WEAPONS.draco.radius}m` : weapon === 'bat' ? '선택한 물체 1개' : weapon === 'nuke' ? '방송국 전체' : `피해 반경 ${WEAPONS[weapon].radius}m`; }

export function damageGuideRadius(weapon:WeaponId){return weapon==='draco'?WEAPONS.draco.spread+WEAPONS.draco.radius:WEAPONS[weapon].radius;}
