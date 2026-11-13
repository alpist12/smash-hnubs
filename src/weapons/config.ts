import bat from './bat';
import bomb from './bomb';
import laser from './laser';
import sonic from './sonic';
import missile from './missile';
import meteor from './meteor';
export const WEAPONS = { bat, bomb, laser, sonic, missile, meteor };
export type WeaponId = keyof typeof WEAPONS;
