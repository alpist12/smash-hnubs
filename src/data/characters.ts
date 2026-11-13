import type { V3 } from './types';
export type CharacterAppearance = 'wonjae' | 'yujin';
export interface CharacterProfile { id: string; name: string; pos: V3; appearance: CharacterAppearance; camera: 'character' | 'yujin'; voice: boolean }
export const CHARACTERS: CharacterProfile[] = [
  { id: 'character-wonjae', name: '원재 선배', pos: [-3.6, 0, 2.5], appearance: 'wonjae', camera: 'character', voice: true },
  { id: 'character-yujin', name: '유진 선배', pos: [-4.4, 0, 1.0], appearance: 'yujin', camera: 'yujin', voice: false },
];
