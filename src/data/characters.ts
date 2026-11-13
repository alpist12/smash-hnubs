import type { V3 } from './types';
export interface CharacterProfile { id: string; name: string; pos: V3; camera: 'character'; voice: boolean; /** public/ 기준 GLB 경로 */ model: string }
export const CHARACTERS: CharacterProfile[] = [
  { id: 'character-wonjae', name: '원재 선배', pos: [-3.6, 0, 2.5], camera: 'character', voice: true, model: 'characters/wonjae.glb' },
];
