import bat from './bat';
import bomb from './bomb';
import laser from './laser';
import sonic from './sonic';
import missile from './missile';
export const WEAPONS = { bat, bomb, laser, sonic, missile };
export type WeaponId = keyof typeof WEAPONS;
