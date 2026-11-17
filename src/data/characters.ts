import type { V3 } from './types';
export interface WanderStyle { speed:number; startDelay:[number,number]; firstRoomMs:number; pause:[number,number]; stayChance:number; stops:[{x:number;z:number},{x:number;z:number},{x:number;z:number}]; roomWeights:[[number,number,number],[number,number,number],[number,number,number]] }
export interface CharacterProfile { id: string; name: string; pos: V3; camera: 'character' | 'yujin'; voice: boolean; wander: WanderStyle; /** public/ 기준 GLB 경로 */ model: string; /** 화면에 보이는 키(m) */ height: number }
export const CHARACTERS: CharacterProfile[] = [
  { id: 'character-wonjae', name: '원재 선배', pos: [-3.6, 0, 2.5], camera: 'character', voice: true, model: 'characters/wonjae.glb', height: 1.85, wander: { speed: .65, startDelay: [3500,6500], firstRoomMs: 25000, pause: [2500,6000], stayChance: .65, stops: [{x:-3.6,z:2.2},{x:0,z:-6.1},{x:-3.7,z:-13.2}], roomWeights: [[0,65,35],[65,0,35],[65,35,0]] } },
  { id: 'character-yujin', name: '유진 선배', pos: [-4.4, 0, 1.0], camera: 'yujin', voice: false, model: 'characters/yujin.glb', height: 1.72, wander: { speed: .9, startDelay: [7500,11000], firstRoomMs: 18000, pause: [1300,3200], stayChance: .35, stops: [{x:3.1,z:2.8},{x:3.7,z:-7.4},{x:0,z:-13.5}], roomWeights: [[0,35,65],[35,0,65],[65,35,0]] } },
];
