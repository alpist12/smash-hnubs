import { type ThreeEvent } from '@react-three/fiber';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { BOOTH_WALL_Z, PLATFORM_EDGE_X, STUDIOS, STUDIO_END, STUDIO_START } from '../data/studios';
import type { Part, V3 } from '../data/types';
import { studioTexture } from './studioTextures';
import { PartMesh } from './PartMesh';
import { useGame } from '../game/store';
import { aim, attack } from '../physics/attacks';

const H = 2.8, HALF = 7, SPAN = STUDIO_START - STUDIO_END, MID = (STUDIO_START + STUDIO_END) / 2;
const TECH = STUDIOS.find(s => s.id === 'technical')!, ANNOUNCER = STUDIOS.find(s => s.id === 'announcer')!;

function Block({ pos, size, finish = 'fabric', color = '#8295a2', rotation }: { pos: V3; size: V3; finish?: Part['finish']; color?: string; rotation?: V3 }) {
  return <PartMesh part={{ name: '부스 구조', pos, size, finish, color, round: .01, rotation }} />;
}
function floorHandlers() {
  const move = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); aim.point = e.point.toArray() as V3; aim.target = ''; aim.normal = [0, 1, 0]; };
  return {
    onPointerMove: move,
    onPointerDown: (e: ThreeEvent<PointerEvent>) => { move(e); if (e.button === 0 && useGame.getState().weapon === 'laser') { aim.holding = true; attack(aim.point); } },
    onClick: (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (e.delta < 5 && e.button === 0 && useGame.getState().weapon !== 'laser') attack(e.point.toArray() as V3); },
  };
}
function Ceilings() {
  const ceiling = useGame(s => s.ceiling);
  if (!ceiling) return null;
  return <>
    {/* 기술부스: 흰 텍스 + 4방향 에어컨 카세트 */}
    <mesh position={[0, H, TECH.centerZ]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[14, TECH.depth]} /><meshStandardMaterial map={studioTexture('ceiling', 14, TECH.depth)} transparent opacity={.22} side={2} depthWrite={false} /></mesh>
    <group position={[1.4, H - .18, TECH.centerZ + .6]}>
      <Block pos={[0, 0, 0]} size={[.9, .12, .9]} finish="white" color="#dcdcd4" />
      <Block pos={[0, -.065, 0]} size={[.56, .01, .56]} finish="metal" color="#8c9496" />
      {Array.from({ length: 10 }, (_, i) => <Block key={i} pos={[(i - 4.5) * .05, -.072, 0]} size={[.012, .008, .52]} finish="white" color="#e9e9e3" />)}
    </group>
    {/* 아나부스: 남색 천장 + 긴 선형 디퓨저 */}
    <mesh position={[0, H, ANNOUNCER.centerZ]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[14, ANNOUNCER.depth]} /><meshStandardMaterial color="#2c3646" transparent opacity={.3} side={2} depthWrite={false} /></mesh>
    <Block pos={[.8, H - .03, BOOTH_WALL_Z - 1.1]} size={[3.2, .04, .22]} finish="white" color="#d9dbd6" />
    {[-.04, .04].map(dz => <Block key={dz} pos={[.8, H - .052, BOOTH_WALL_Z - 1.1 + dz]} size={[3.0, .01, .025]} finish="black" color="#30363a" />)}
  </>;
}
export function Studios() {
  const handlers = floorHandlers();
  const techStart = STUDIO_START, techEnd = BOOTH_WALL_Z, techDepth = techStart - techEnd, techMid = (techStart + techEnd) / 2;
  const platformWidth = HALF - PLATFORM_EDGE_X, platformX = (HALF + PLATFORM_EDGE_X) / 2;
  return <group name="HNUBS-studios-photo-reference">
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider position={[0, -.12, MID]} args={[HALF, .12, SPAN / 2]} />
      {/* 진회색 카펫: 아나부스 전체 + 기술부스 왼쪽 통로 */}
      <mesh position={[0, -.015, MID]} receiveShadow {...handlers}>
        <boxGeometry args={[HALF * 2, .03, SPAN]} /><meshStandardMaterial map={studioTexture('carpet', HALF * 2, SPAN)} roughness={1} />
      </mesh>
      {/* 기술부스 이중바닥 타일 단 */}
      <CuboidCollider position={[platformX, .06, techMid]} args={[platformWidth / 2, .06, techDepth / 2]} />
      <mesh position={[platformX, .06, techMid]} receiveShadow {...handlers}>
        <boxGeometry args={[platformWidth, .12, techDepth]} /><meshStandardMaterial map={studioTexture('tile', platformWidth, techDepth)} roughness={.7} />
      </mesh>
      <Block pos={[PLATFORM_EDGE_X - .012, .06, techMid]} size={[.03, .125, techDepth]} finish="metal" color="#2f3a44" />
      <Block pos={[PLATFORM_EDGE_X - .02, .115, techMid]} size={[.05, .02, techDepth]} finish="metal" color="#5f6a70" />
      <Block pos={[0, -.17, MID]} size={[HALF * 2 + .24, .3, SPAN]} finish="metal" color="#686b68" />
    </RigidBody>
    <Ceilings />
  </group>;
}
