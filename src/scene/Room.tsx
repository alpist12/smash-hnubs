import { useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { BoxGeometry, CanvasTexture, Group, InstancedMesh, Matrix4, SRGBColorSpace } from 'three';
import { ROOM } from '../data/room';
import type { Part, V3 } from '../data/types';
import { PartMesh } from './PartMesh';
import { maps, bumps, material } from './materials';
import { aim, attack } from '../physics/attacks';
import { useGame } from '../game/store';

function B({ pos, size, color, finish = 'wood' }: { pos: V3; size: V3; color?: string; finish?: Part['finish'] }) {
  return <PartMesh part={{ name: '실내 구조', pos, size, finish, color }} />;
}
type PanelRow = 'lower' | 'band' | 'upper';
// 사진: 하단 원목 → 하늘색 흡음 패널 띠 → 상단 원목 패널.
const ROWS: Record<PanelRow, { y: number; h: number; pitch: number; finish: Part['finish']; color: string }> = {
  lower: { y: .51, h: 1.02, pitch: .6, finish: 'wood', color: '#d2bc98' },
  band: { y: 1.5, h: .86, pitch: .9, finish: 'fabric', color: '#a5b4c6' },
  upper: { y: 2.37, h: .82, pitch: .9, finish: 'wood', color: '#d8c4a3' },
};
function RepeatedPanels({ width, row }: { width: number; row: PanelRow }) {
  const spec = ROWS[row], ref = useRef<InstancedMesh>(null), count = Math.max(1, Math.round(width / spec.pitch));
  const geometry = useMemo(() => new BoxGeometry(width / count - .012, spec.h - .02, .03), [width, count, spec.h]);
  const mat = material(spec.finish, spec.color, false, spec.finish === 'wood');
  const matrices = useMemo(() => Array.from({ length: count }, (_, i) => new Matrix4().makeTranslation(-width / 2 + (i + .5) * width / count, spec.y, .075)), [width, count, spec.y]);
  useFrame(() => {
    if (!ref.current || ref.current.userData.done) return;
    matrices.forEach((matrix, i) => ref.current!.setMatrixAt(i, matrix));
    ref.current.instanceMatrix.needsUpdate = true; ref.current.userData.done = true;
  });
  return <instancedMesh ref={ref} args={[geometry, mat, count]} receiveShadow castShadow />;
}
function Wall({ width, door }: { width: number; door?: number }) {
  if (door !== undefined) return <>
    {[[(-width / 2 + door - .53) / 2, door - .53 + width / 2], [(door + .53 + width / 2) / 2, width / 2 - door - .53]].map(([x, span]) => <group key={x} position={[x, 0, 0]}><Wall width={span} /></group>)}
    <B pos={[door, 2.49, 0]} size={[1.06, .62, .12]} color="#d8c4a3" />
    {[-.56, .56].map(x => <B key={x} pos={[door + x, 1.08, .02]} size={[.07, 2.16, .16]} color="#cdb791" />)}
    <B pos={[door, 2.16, .02]} size={[1.18, .07, .16]} color="#cdb791" />
  </>;
  return <>
    <B pos={[0, 1.4, 0]} size={[width, 2.8, .1]} finish="white" color="#c9bda6" />
    <RepeatedPanels width={width} row="lower" /><RepeatedPanels width={width} row="band" /><RepeatedPanels width={width} row="upper" />
    <B pos={[0, 1.05, .1]} size={[width, .05, .06]} color="#b89f7c" />
    <B pos={[0, 1.95, .1]} size={[width, .05, .06]} color="#b89f7c" />
    <B pos={[0, .065, .1]} size={[width, .1, .055]} color="#a18e78" />
    <B pos={[0, 2.79, .1]} size={[width, .08, .12]} finish="white" color="#bdbeb5" />

  </>;
}
function Board() {
  // 사진: 스크린 오른쪽 알루미늄 테두리 초록 칠판 + 네컷 사진들 + 분필 글씨.
  const texture = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 330; const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#2f3b36'; ctx.fillRect(0, 0, 512, 330);
    let seed = 11; const r = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 2500; i++) { ctx.fillStyle = `rgba(220,230,220,${r() * .05})`; ctx.fillRect(r() * 512, r() * 330, 3, 2); }
    for (let i = 0; i < 26; i++) { const x = 230 + (i % 9) * 30, y = 18 + Math.floor(i / 9) * 46; ctx.fillStyle = '#ecebe4'; ctx.fillRect(x, y, 24, 40); ctx.fillStyle = ['#59606a', '#8a8f96', '#3e4349'][i % 3]; for (let k = 0; k < 4; k++) ctx.fillRect(x + 3, y + 3 + k * 9, 18, 7); }
    for (let i = 0; i < 9; i++) { const x = 18 + (i % 3) * 34, y = 120 + Math.floor(i / 3) * 52; ctx.fillStyle = '#eeede6'; ctx.fillRect(x, y, 28, 44); ctx.fillStyle = '#7d828a'; ctx.fillRect(x + 3, y + 3, 22, 30); }
    ctx.fillStyle = '#f2efe6'; ctx.font = 'bold 30px sans-serif'; ctx.fillText('HNUBS', 30, 52); ctx.font = '19px sans-serif'; ctx.fillStyle = '#f4b9c8'; ctx.fillText('끌어치기 ✿', 40, 88);
    ctx.fillStyle = '#d9ecf2'; ctx.font = '26px sans-serif'; ctx.fillText('25년 방송국 화이팅', 250, 290);
    ctx.strokeStyle = '#e8e6dc'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(140, 140 + i * 30); ctx.lineTo(215, 135 + i * 30); ctx.stroke(); }
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
  }, []);
  return <group position={[-ROOM.width * (.3 / 8.8) + .9, 1.62, .13]}>
    <B pos={[0, 0, 0]} size={[1.62, 1.04, .05]} finish="metal" color="#b9bdba" />
    <mesh position={[0, 0, .03]}><planeGeometry args={[1.54, .96]} /><meshStandardMaterial map={texture} roughness={.95} /></mesh>
    <B pos={[0, -.55, .05]} size={[1.5, .03, .07]} finish="metal" color="#a9aeab" />
  </group>;
}
function Whiteboard({ title, lines, calendar = false }: { title: string; lines: string[]; calendar?: boolean }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 360; const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#f4f4f0'; ctx.fillRect(0, 0, 512, 360);
    if (calendar) {
      ctx.fillStyle = '#5b9bd5'; ctx.fillRect(20, 14, 26, 26); ctx.fillStyle = '#36424a'; ctx.font = 'bold 24px sans-serif'; ctx.fillText(title, 150, 36);
      const colors = ['#e88a9a', '#9a7fc4', '#7fa7c9', '#8cc49c', '#e6c36c', '#d99a6c', '#7fbfbf'];
      for (let d = 0; d < 7; d++) { ctx.fillStyle = colors[d]; ctx.fillRect(20 + d * 68, 52, 64, 14); }
      ctx.strokeStyle = '#b8bcbd'; ctx.lineWidth = 1.5;
      for (let r = 0; r < 5; r++) for (let d = 0; d < 7; d++) { ctx.strokeRect(20 + d * 68, 70 + r * 52, 64, 50); ctx.fillStyle = '#4a5358'; ctx.font = '12px sans-serif'; ctx.fillText(String(r * 7 + d + 1), 24 + d * 68, 84 + r * 52); if ((r * 7 + d) % 4 === 1) { ctx.fillStyle = ['#d24a4a', '#2e7d4f', '#2f5fae'][(r + d) % 3]; ctx.fillRect(26 + d * 68, 92 + r * 52, 40, 3); ctx.fillRect(26 + d * 68, 100 + r * 52, 28, 3); } }
    } else {
      ctx.fillStyle = '#2c3540'; ctx.font = '30px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(title, 256, 42); ctx.textAlign = 'left';
      ctx.font = '17px sans-serif'; lines.forEach((line, i) => { ctx.fillStyle = '#323b46'; ctx.fillText(`${i + 1}. ${line}`, 40, 78 + i * 28); });
    }
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
  }, [title, lines, calendar]);
  return <>
    <B pos={[0, 0, 0]} size={[1.45, 1.02, .04]} finish="metal" color="#b9bcba" />
    <mesh position={[0, 0, .022]}><planeGeometry args={[1.38, .95]} /><meshStandardMaterial map={texture} roughness={.35} /></mesh>
    <B pos={[0, -.53, .04]} size={[1.2, .025, .06]} finish="metal" color="#a5a9a7" />
  </>;
}
function Windows() {
  const paneWidth = (ROOM.depth - .8) / 4;
  const clock = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#303841'; ctx.beginPath(); ctx.arc(128, 128, 125, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e4e3da'; ctx.font = '24px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let n = 1; n <= 12; n++) { const a = n * Math.PI / 6; ctx.fillText(String(n), 128 + Math.sin(a) * 94, 128 - Math.cos(a) * 94); }
    ctx.strokeStyle = '#e4e3da'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(128, 128); ctx.lineTo(168, 77); ctx.moveTo(128, 128); ctx.lineTo(207, 129); ctx.stroke();
    return new CanvasTexture(canvas);
  }, []);
  return <>
    {[-1.5, -.5, .5, 1.5].map((x, index) => <group key={x} position={[x * (paneWidth + .14), 1.86, .14]}>
      <B pos={[0, 0, 0]} size={[paneWidth, 1.5, .045]} finish="metal" color="#b5b9b1" />
      <B pos={[0, 0, .03]} size={[paneWidth - .08, 1.41, .015]} finish="glass" color="#78898e" />
      <B pos={[0, index === 0 ? .1 : .3, .055]} size={[paneWidth - .07, index === 0 ? 1.2 : .82, .02]} finish="fabric" color="#e6e0d1" />
      <B pos={[0, .75, .055]} size={[paneWidth + .05, .045, .075]} finish="white" color="#d2cdbd" />
      <B pos={[0, index === 0 ? -.72 : -.23, .07]} size={[paneWidth - .05, .02, .03]} finish="metal" color="#b3b4a8" />
    </group>)}
    <B pos={[0, 1.08, .2]} size={[ROOM.depth - .18, .05, .32]} finish="metal" color="#8c908f" />
    <B pos={[0, 1.4, .2]} size={[.26, 2.8, .12]} color="#c5b38e" />
    <mesh position={[0, 2.28, .27]}><circleGeometry args={[.18, 32]} /><meshStandardMaterial map={clock} /></mesh>
    <B pos={[0, 1.73, .27]} size={[.2, .52, .01]} finish="paper" color="#e0ddda" />
    {[1.56, 1.71, 1.86].map(y => <B key={y} pos={[0, y, .278]} size={[.14, .035, .005]} finish="paper" color="#987a9c" />)}
  </>;
}
const RULES = ['방송 20분 전 와서 준비하기', '자신의 행동에 책임지기', '외부인 출입금지', '통화 에티켓 지키기', '상호존중하기', '청소 잘하기', '남의 물건 함부로 건드리지 않기', '문단속 잘하기', '냉장고 이름 적어서 넣기', '기술부스·아나부스 음식물 반입금지'];
function NoticeBoards() {
  // 사진: 뒷벽 흡음 띠 위에 'HNUBS 규칙' 화이트보드, 월중행사 계획표, 철망 메모판, 금연 표지.
  return <>
    <group position={[-1.3, 1.62, .15]}><Whiteboard title="HNUBS 규칙" lines={RULES} /></group>
    <group position={[.45, 1.62, .15]}><Whiteboard title="월중행사 및 계획표" lines={[]} calendar /></group>
    <group position={[1.62, 1.68, .13]}>
      <B pos={[0, 0, 0]} size={[.62, .62, .01]} finish="metal" color="#e9ebea" />
      {[-.2, 0, .2].map(x => <B key={x} pos={[x, -.02, .015]} size={[.16, .22, .004]} finish="paper" color="#f2f1ec" />)}
    </group>
    <B pos={[1.35, 1.22, .13]} size={[.26, .1, .005]} finish="paper" color="#f3f2ee" />
    <B pos={[1.35, 1.22, .134]} size={[.06, .06, .003]} finish="paper" color="#c8352f" />
    <B pos={[-2.65, 1.62, .13]} size={[.42, .6, .005]} finish="paper" color="#d8c9a4" />
  </>;
}
function DoorLeaf({ x, leather = false, open = 0 }: { x: number; leather?: boolean; open?: number }) {
  // leather: 기술부스로 통하는 주황 가죽 누빔 방음문(열림). 아니면 복도로 나가는 원목 문(닫힘).
  return <group position={[x - .52, 0, .1]} rotation={[0, open, 0]}>
    <B pos={[.52, 1.05, 0]} size={[1.0, 2.08, .06]} finish={leather ? 'white' : 'wood'} color={leather ? '#a7a49b' : '#d6c3a0'} />
    {leather && <>
      <B pos={[.52, 1.1, .035]} size={[.58, 1.62, .025]} finish="leather" color="#b8752f" />
      {[.42, .62].flatMap(px => [.55, .95, 1.35, 1.75].map(py => <B key={`${px}-${py}`} pos={[px, py, .05]} size={[.025, .025, .01]} finish="metal" color="#cfcfca" />))}
    </>}
    <B pos={[.9, 1.02, .05]} size={[.12, .025, .04]} finish="metal" color="#b7bbb9" />
  </group>;
}
/** 메인룸 뒷벽(규칙 화이트보드 벽): 메인룸·전체 보기에서는 보이고, 부스를 들여다보는 시점에서는 숨긴다. */
export function backWallVisible(walls: boolean, cameraZ: number) {
  const mode = useGame.getState().cameraMode;
  return walls && (mode === 'home' || mode === 'top') && cameraZ > -ROOM.depth / 2 + .1;
}
export function Room() {
  const back = useRef<Group>(null), front = useRef<Group>(null), left = useRef<Group>(null), right = useRef<Group>(null);
  const walls = useGame(s => s.walls), ceiling = useGame(s => s.ceiling);
  const high = useGame(s => s.quality === 'high');
  useFrame(({ camera }) => {
    if (back.current) back.current.visible = backWallVisible(walls, camera.position.z);
    if (front.current) front.current.visible = walls && camera.position.z < ROOM.depth / 2 - .1;
    if (left.current) left.current.visible = walls && camera.position.x > -ROOM.width / 2 + .1;
    if (right.current) right.current.visible = walls && camera.position.x < ROOM.width / 2 - .1;
  });
  function floorAim(e: ThreeEvent<PointerEvent>) { e.stopPropagation(); aim.point = e.point.toArray() as V3; aim.target = ''; }
  return <group name="HNUBS-room-architecture">
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider position={[0, -.12, 0]} args={[ROOM.width / 2 + .05, .12, ROOM.depth / 2 + .05]} />
      {[-1, 1].map(sign => <group key={sign}>
        <CuboidCollider position={[sign * (ROOM.width / 2 + .08), 1.4, 0]} args={[.08, 1.4, ROOM.depth / 2]} />
        {sign > 0 ? <CuboidCollider position={[0, 1.4, ROOM.depth / 2 + .08]} args={[ROOM.width / 2, 1.4, .08]} /> : <>
          <CuboidCollider position={[-5.95, 1.4, -4.5]} args={[1.05, 1.4, .08]} /><CuboidCollider position={[1.575, 1.4, -4.5]} args={[5.425, 1.4, .08]} /><CuboidCollider position={[-4.375, 2.5, -4.5]} args={[.525, .3, .08]} />
        </>}
      </group>)}
      <mesh receiveShadow position={[0, -.015, 0]} onPointerMove={floorAim} onPointerDown={e => { floorAim(e); if (e.button === 0 && useGame.getState().weapon === 'laser') { aim.holding = true; attack(aim.point); } }} onClick={e => { e.stopPropagation(); if (e.delta < 5 && e.button === 0 && useGame.getState().weapon !== 'laser') attack(e.point.toArray() as V3); }}>
        <boxGeometry args={[ROOM.width, .03, ROOM.depth]} /><meshStandardMaterial color="#8a7c86" map={maps.carpet} bumpMap={high ? bumps.carpet : null} bumpScale={.012} roughness={1} />
      </mesh>
      <B pos={[0, -.17, 0]} size={[ROOM.width + .24, .3, ROOM.depth + .24]} finish="metal" color="#686b68" />
    </RigidBody>
    <group ref={back} position={[0, 0, -ROOM.depth / 2]}><Wall width={ROOM.width} door={-ROOM.width * .3125} /><DoorLeaf x={-ROOM.width * .3125} leather open={-1.25} /><NoticeBoards /></group>
    <group ref={front} position={[0, 0, ROOM.depth / 2]} rotation={[0, Math.PI, 0]}><Wall width={ROOM.width} />
      <B pos={[0, 2.46, .12]} size={[ROOM.width, .64, .04]} color="#c6b899" />
      <B pos={[0, 2.7, .15]} size={[ROOM.width, .025, .025]} color="#b0a48c" />
      <B pos={[-ROOM.width / 2 + .2, 1.4, .13]} size={[.16, 2.8, .09]} color="#c6b899" />
      <Board />
      {/* 사용자 평면도의 주황 선: 창문이 아닌 빔프로젝터 스크린. */}
      <group position={[-ROOM.width * .3125, 1.68, .15]}>
        <B pos={[0, 0, .01]} size={[2, 1.3, .025]} finish="black" color="#343b41" />
        <B pos={[0, 0, .026]} size={[1.94, 1.28, .008]} finish="white" color="#e2e5dc" />
        <PartMesh part={{ name: '흰색 롤스크린 케이스', pos: [0, .69, .025], size: [2.14, .06, .075], finish: 'white', color: '#e3e6dc', round: .015 }} />
        <B pos={[0, -.66, .035]} size={[2.06, .025, .035]} finish="metal" color="#b2b7ad" />
      </group>
    </group>
    <group ref={left} position={[-ROOM.width / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}><Wall width={ROOM.depth} door={-ROOM.depth * (1.32 / 4.7)} /><DoorLeaf x={-ROOM.depth * (1.32 / 4.7)} />
    </group>
    <group ref={right} position={[ROOM.width / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}><Wall width={ROOM.depth} /><Windows /></group>
    {ceiling && <group position={[0, ROOM.height, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[ROOM.width, ROOM.depth]} /><meshStandardMaterial color="#d9d8ca" transparent opacity={.15} depthWrite={false} side={2} /></mesh>
      <B pos={[-1.1, -.08, 0]} size={[.85, .11, .85]} finish="white" color="#d0d1c6" />
      {Array.from({ length: 9 }, (_, i) => <B key={i} pos={[-1.1 + (i - 4) * .06, -.145, 0]} size={[.018, .012, .54]} finish="metal" color="#8e9797" />)}
    </group>}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.34, 0]} receiveShadow><planeGeometry args={[200, 200]} /><meshStandardMaterial color="#cdd1d4" roughness={1} /></mesh>
  </group>;
}
