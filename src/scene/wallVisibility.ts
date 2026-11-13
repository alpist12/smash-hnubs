import { useGame } from '../game/store';
import { ROOM } from '../data/room';
import { STUDIO_END } from '../data/studios';

export type { WallSide } from '../data/types';
import type { WallSide } from '../data/types';
/**
 * 바깥 벽은 카메라가 벽 바깥쪽에 있을 때 잘라 내 안을 보이게 하고(돌하우스 컷어웨이),
 * 메인룸과 기술부스 사이 벽은 시점에 상관없이 유지한다.
 */
export function wallVisible(side: WallSide, x: number, z: number) {
  const { walls, cameraMode: mode } = useGame.getState();
  if (!walls) return false;
  switch (side) {
    case 'front': return z < ROOM.depth / 2 - .1;
    case 'left': return x > -ROOM.width / 2 + .1;
    case 'right': return x < ROOM.width / 2 - .1;
    case 'back': return true;
    case 'booth': return mode !== 'announcer' && mode !== 'photo';
    case 'outer': return z > STUDIO_END + .1;
    case 'studioLeft': return x > -ROOM.width / 2 + .1;
    case 'studioRight': return x < ROOM.width / 2 - .1;
  }
}
