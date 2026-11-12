import { useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { Group } from 'three';
import { BOOTH_DOOR, BOOTH_WALL_Z, BOOTH_WINDOW, PLATFORM_EDGE_X, STUDIOS, STUDIO_END, STUDIO_START } from '../data/studios';
import type { Part, V3 } from '../data/types';
import { studioTexture, type StudioTextureKind } from './studioTextures';
import { PartMesh } from './PartMesh';
import { useGame } from '../game/store';
import { aim, attack } from '../physics/attacks';
import { wallVisible } from './wallVisibility';

const H = 2.8, HALF = 7, SPAN = STUDIO_START - STUDIO_END, MID = (STUDIO_START + STUDIO_END) / 2;
const TECH = STUDIOS.find(s => s.id === 'technical')!, ANNOUNCER = STUDIOS.find(s => s.id === 'announcer')!;
const WOOD = '#cdb791', BASEBOARD = '#bfa77f';

function Block({ pos, size, finish = 'fabric', color = '#8295a2', rotation }: { pos: V3; size: V3; finish?: Part['finish']; color?: string; rotation?: V3 }) {
  return <PartMesh part={{ name: '부스 구조', pos, size, finish, color, round: .01, rotation }} />;
}
/** 실제 크기로 반복되는 텍스처를 입힌 박스(벽·바닥). */
function Surface({ pos, size, kind, uv, rough = 1 }: { pos: V3; size: V3; kind: StudioTextureKind; uv: [number, number]; rough?: number }) {
  return <mesh position={pos} castShadow={kind === 'acoustic'} receiveShadow><boxGeometry args={size} /><meshStandardMaterial map={studioTexture(kind, ...uv)} roughness={rough} /></mesh>;
}
function floorHandlers() {
  const move = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); aim.point = e.point.toArray() as V3; aim.target = ''; };
  return {
    onPointerMove: move,
    onPointerDown: (e: ThreeEvent<PointerEvent>) => { move(e); if (e.button === 0 && useGame.getState().weapon === 'laser') { aim.holding = true; attack(aim.point); } },
    onClick: (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (e.delta < 5 && e.button === 0 && useGame.getState().weapon !== 'laser') attack(e.point.toArray() as V3); },
  };
}
/** 가로 벽(z 고정). openings: [x0, x1] 구간은 비운다. */
function wallSegments(openings: [number, number][]) {
  const result: [number, number][] = []; let x = -HALF;
  for (const [a, b] of [...openings].sort((p, q) => p[0] - q[0])) { if (a > x) result.push([x, a]); x = b; }
  if (x < HALF) result.push([x, HALF]);
  return result;
}
function AcousticRun({ z, segments, thickness = .12 }: { z: number; segments: [number, number][]; thickness?: number }) {
  return <>{segments.map(([a, b]) => <Surface key={a} pos={[(a + b) / 2, H / 2, z]} size={[b - a, H, thickness]} kind="acoustic" uv={[b - a, H]} />)}</>;
}
function Baseboard({ z, segments, side }: { z: number; segments: [number, number][]; side: 1 | -1 }) {
  return <>{segments.map(([a, b]) => <Block key={a} pos={[(a + b) / 2, .06, z + side * .07]} size={[b - a, .12, .025]} finish="wood" color={BASEBOARD} />)}</>;
}
function BoothWall() {
  const ref = useRef<Group>(null);
  useFrame(({ camera }) => { if (ref.current) ref.current.visible = wallVisible('booth', camera.position.x, camera.position.z); });
  const door: [number, number] = [BOOTH_DOOR.x - BOOTH_DOOR.width / 2, BOOTH_DOOR.x + BOOTH_DOOR.width / 2];
  const win: [number, number] = [BOOTH_WINDOW.x - BOOTH_WINDOW.width / 2, BOOTH_WINDOW.x + BOOTH_WINDOW.width / 2];
  const full = wallSegments([door, win]), { bottom, top } = BOOTH_WINDOW, ww = BOOTH_WINDOW.width, z = BOOTH_WALL_Z;
  return <>
    <RigidBody type="fixed" colliders={false}>
      {full.map(([a, b]) => <CuboidCollider key={a} position={[(a + b) / 2, H / 2, z]} args={[(b - a) / 2, H / 2, .06]} />)}
      <CuboidCollider position={[BOOTH_DOOR.x, 2.45, z]} args={[BOOTH_DOOR.width / 2, .35, .06]} />
      <CuboidCollider position={[BOOTH_WINDOW.x, bottom / 2, z]} args={[ww / 2, bottom / 2, .06]} />
      <CuboidCollider position={[BOOTH_WINDOW.x, (top + H) / 2, z]} args={[ww / 2, (H - top) / 2, .06]} />
    </RigidBody>
    <group ref={ref}>
      <AcousticRun z={z} segments={full} />
      <Baseboard z={z} segments={wallSegments([door, [-HALF, PLATFORM_EDGE_X]])} side={1} />
      <Baseboard z={z} segments={wallSegments([door])} side={-1} />
      <Surface pos={[BOOTH_DOOR.x, 2.45, z]} size={[BOOTH_DOOR.width, .7, .12]} kind="acoustic" uv={[BOOTH_DOOR.width, .7]} />
      <Surface pos={[BOOTH_WINDOW.x, bottom / 2, z]} size={[ww, bottom, .12]} kind="acoustic" uv={[ww, bottom]} />
      <Surface pos={[BOOTH_WINDOW.x, (top + H) / 2, z]} size={[ww, H - top, .12]} kind="acoustic" uv={[ww, H - top]} />
      {/* 넓은 원목 프레임 (이중 유리는 부술 수 있는 glassPane 물체) */}
      {[-1, 1].map(side => <group key={side}>
        <Block pos={[BOOTH_WINDOW.x + side * (ww / 2 + .07), (bottom + top) / 2, 0 + z]} size={[.16, top - bottom + .3, .22]} finish="wood" color={WOOD} />
        <Block pos={[BOOTH_WINDOW.x, side < 0 ? bottom - .07 : top + .07, z]} size={[ww + .3, .16, .22]} finish="wood" color={WOOD} />
      </group>)}
      {/* 문틀 */}
      {door.map(x => <Block key={x} pos={[x, 1.1, z]} size={[.07, 2.2, .18]} finish="wood" color={WOOD} />)}
      <Block pos={[BOOTH_DOOR.x, 2.17, z]} size={[BOOTH_DOOR.width + .07, .07, .18]} finish="wood" color={WOOD} />
      {/* 기술부스 쪽 문 옆 회색 분전함 */}
      <Block pos={[BOOTH_DOOR.x + .95, .55, z + .1]} size={[.34, .4, .1]} finish="white" color="#c9c7bb" />
      {/* 아나부스 쪽 조명 스위치 */}
      <Block pos={[BOOTH_DOOR.x + .85, 1.25, z - .07]} size={[.08, .13, .015]} finish="white" color="#efeee8" />
      {/* 세로 원목 기둥 몰딩 */}
      {[-6.2, -.6].map(x => <Block key={x} pos={[x, H / 2, z + .075]} size={[.09, H, .03]} finish="wood" color={WOOD} />)}
    </group>
  </>;
}
function OuterWall() {
  const ref = useRef<Group>(null), walls = useGame(s => s.walls);
  useFrame(({ camera }) => { if (ref.current) ref.current.visible = walls && camera.position.z > STUDIO_END; });
  return <>
    <RigidBody type="fixed" colliders={false}><CuboidCollider position={[0, H / 2, STUDIO_END - .06]} args={[HALF, H / 2, .06]} /></RigidBody>
    <group ref={ref}>
      <AcousticRun z={STUDIO_END - .06} segments={[[-HALF, HALF]]} />
      <Baseboard z={STUDIO_END - .06} segments={[[-HALF, HALF]]} side={1} />
      {[-5.6, 6.0].map(x => <Block key={x} pos={[x, H / 2, STUDIO_END + .02]} size={[.09, H, .03]} finish="wood" color={WOOD} />)}
    </group>
  </>;
}
function SideWalls() {
  const left = useRef<Group>(null), right = useRef<Group>(null), walls = useGame(s => s.walls);
  useFrame(({ camera }) => { if (left.current) left.current.visible = walls && camera.position.x > -HALF; if (right.current) right.current.visible = walls && camera.position.x < HALF; });
  return <>{[-1, 1].map(sign => <group key={sign} ref={sign < 0 ? left : right}>
    <Surface pos={[sign * HALF, H / 2, MID]} size={[.12, H, SPAN]} kind="acoustic" uv={[SPAN, H]} />
    <Block pos={[sign * (HALF - .07), .06, ANNOUNCER.centerZ]} size={[.025, .12, ANNOUNCER.depth]} finish="wood" color={BASEBOARD} />
    {sign < 0 && <Block pos={[sign * (HALF - .07), .06, (STUDIO_START + BOOTH_WALL_Z) / 2]} size={[.025, .12, TECH.depth]} finish="wood" color={BASEBOARD} />}
    {[BOOTH_WALL_Z - .25, BOOTH_WALL_Z + .25, STUDIO_END + .25, STUDIO_START - .25].map(z => <Block key={z} pos={[sign * (HALF - .07), H / 2, z]} size={[.03, H, .09]} finish="wood" color={WOOD} />)}
  </group>)}</>;
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
      {[-1, 1].map(sign => <CuboidCollider key={sign} position={[sign * (HALF + .08), H / 2, MID]} args={[.08, H / 2, SPAN / 2]} />)}
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
    <BoothWall /><OuterWall /><SideWalls /><Ceilings />
  </group>;
}
