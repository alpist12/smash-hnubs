import type { V3 } from './types';
export interface CharacterProfile { id: string; name: string; pos: V3; camera: 'character' | 'yujin'; voice: boolean; /** public/ 기준 GLB 경로 */ model: string; /** 화면에 보이는 키(m) */ height: number }
export const CHARACTERS: CharacterProfile[] = [
  { id: 'character-wonjae', name: '원재 선배', pos: [-3.6, 0, 2.5], camera: 'character', voice: true, model: 'characters/wonjae.glb', height: 1.85 },
  { id: 'character-yujin', name: '유진 선배', pos: [-4.4, 0, 1.0], camera: 'yujin', voice: false, model: 'characters/yujin.glb', height: 1.72 },
];
