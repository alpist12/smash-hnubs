import { type ThreeEvent } from '@react-three/fiber';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { ROOM } from '../data/room';
import type { Part, V3 } from '../data/types';
import { PartMesh } from './PartMesh';
import { maps, bumps } from './materials';
import { aim, attack } from '../physics/attacks';
import { useGame } from '../game/store';
import { wallVisible } from './wallVisibility';

// 메인룸 벽·문·창·벽 부착물은 이제 부술 수 있는 고정 물체(room.ts의 wallSegment 등)로 만든다.
// 이 파일은 바닥·천장·바깥 지면만 맡는다.
function B({ pos, size, color, finish = 'wood' }: { pos: V3; size: V3; color?: string; finish?: Part['finish'] }) {
  return <PartMesh part={{ name: '실내 구조', pos, size, finish, color }} />;
}
export function backWallVisible(_walls: boolean, cameraZ: number) { return wallVisible('back', 0, cameraZ); }
export function Room() {
  const ceiling = useGame(s => s.ceiling), high = useGame(s => s.quality === 'high');
  function floorAim(e: ThreeEvent<PointerEvent>) { e.stopPropagation(); aim.point = e.point.toArray() as V3; aim.target = ''; aim.normal = [0, 1, 0]; }
  return <group name="HNUBS-room-architecture">
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider position={[0, -.12, 0]} args={[ROOM.width / 2 + .05, .12, ROOM.depth / 2 + .05]} />
      <mesh receiveShadow position={[0, -.015, 0]} onPointerMove={floorAim} onPointerDown={e => { floorAim(e); if (e.button === 0 && useGame.getState().weapon === 'laser') { aim.holding = true; attack(aim.point); } }} onClick={e => { e.stopPropagation(); if (e.delta < 5 && e.button === 0 && useGame.getState().weapon !== 'laser') attack(e.point.toArray() as V3); }}>
        <boxGeometry args={[ROOM.width, .03, ROOM.depth]} /><meshStandardMaterial color="#8a7c86" map={maps.carpet} bumpMap={high ? bumps.carpet : null} bumpScale={.012} roughness={1} />
      </mesh>
      <B pos={[0, -.17, 0]} size={[ROOM.width + .24, .3, ROOM.depth + .24]} finish="metal" color="#686b68" />
    </RigidBody>
    {ceiling && <group position={[0, ROOM.height, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[ROOM.width, ROOM.depth]} /><meshStandardMaterial color="#d9d8ca" transparent opacity={.15} depthWrite={false} side={2} /></mesh>
      <B pos={[-1.1, -.08, 0]} size={[.85, .11, .85]} finish="white" color="#d0d1c6" />
      {Array.from({ length: 9 }, (_, i) => <B key={i} pos={[-1.1 + (i - 4) * .06, -.145, 0]} size={[.018, .012, .54]} finish="metal" color="#8e9797" />)}
    </group>}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.34, 0]} receiveShadow><planeGeometry args={[200, 200]} /><meshStandardMaterial color="#cdd1d4" roughness={1} /></mesh>
  </group>;
}
