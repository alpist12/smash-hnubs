import { useGame } from '../game/store';
import { ROOM } from '../data/room';

export type WallSide = 'back' | 'front' | 'left' | 'right' | 'booth';
/**
 * 바깥 벽은 카메라가 벽 바깥쪽에 있을 때 잘라 내 안을 보이게 하고(돌하우스 컷어웨이),
 * 안쪽 벽(메인룸 뒷벽·부스 사이 벽)은 항상 보이되 그 벽 너머를 들여다보는 시점에서만 숨긴다.
 */
export function wallVisible(side: WallSide, x: number, z: number) {
  const { walls, cameraMode: mode } = useGame.getState();
  if (!walls) return false;
  switch (side) {
    case 'front': return z < ROOM.depth / 2 - .1;
    case 'left': return x > -ROOM.width / 2 + .1;
    case 'right': return x < ROOM.width / 2 - .1;
    case 'back': return mode !== 'technical' && mode !== 'announcer' && mode !== 'photo';
    case 'booth': return mode !== 'announcer' && mode !== 'photo';
  }
}
