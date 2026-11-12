import type { Item, Kind, Spec, WallSide } from './types';
import { BOOTH_DOOR, BOOTH_WALL_Z, BOOTH_WINDOW, STUDIO_END, STUDIO_START } from './studios';
export { WORLD } from './studios';
import savedLayout from './layout.json';
import { applyLayout } from './layout';
import { readLocalLayout } from './localLayout';

// shortcut: 실측이 없는 사진 기반 추정치. 실측 후 이 값과 아래 배치만 조정한다.
export const ROOM = { width: 14, depth: 9, height: 2.8, wainscot: 1.02 };
export const specs: Record<Kind, Spec> = {
  mediaCabinet: { label: '유리문 CD 수납장', mass: 55, threshold: 160, score: 90, collision: 42 },
  carton: { label: '장비 보관 상자', mass: 1.5, threshold: 25, score: 10, collision: 10 },
  mixer: { label: '오디오 믹싱 콘솔', mass: 12, threshold: 85, score: 65, collision: 28 },
  microphone: { label: '방송 마이크', mass: 2, threshold: 35, score: 30, collision: 12 },
  speaker: { label: '모니터 스피커', mass: 6, threshold: 55, score: 35, collision: 20 },
  rack: { label: '방송 장비 랙', mass: 38, threshold: 130, score: 90, collision: 35 },
  partition: { label: '회색 사무실 칸막이', mass: 16, threshold: 85, score: 30, collision: 27 },
  desk: { label: '작업 책상', mass: 32, threshold: 115, score: 70, collision: 32 },
  chair: { label: '사무용 의자', mass: 9, threshold: 65, score: 20, collision: 23 },
  bench: { label: '긴 나무 벤치', mass: 15, threshold: 75, score: 25, collision: 26 },
  printer: { label: '프린터와 받침장', mass: 18, threshold: 100, score: 55, collision: 30 },
  stand: { label: '방송용 삼각대', mass: 7, threshold: 45, score: 35, collision: 20 },
  monitor: { label: '모니터', mass: 4, threshold: 42, score: 40, collision: 15 },
  laptop: { label: '노트북', mass: 2, threshold: 46, score: 50, collision: 14 },
  sofa: { label: '소파', mass: 48, threshold: 145, score: 80, collision: 45 },
  cabinet: { label: '목재 수납장', mass: 65, threshold: 190, score: 100, collision: 48 },
  wardrobe: { label: '큰 목재 수납장', mass: 75, threshold: 210, score: 100, collision: 50 },
  fridge: { label: '소형 냉장고', mass: 35, threshold: 150, score: 60, collision: 38 },
  microwave: { label: '전자레인지', mass: 14, threshold: 100, score: 55, collision: 30 },
  coffee: { label: '커피머신', mass: 8, threshold: 65, score: 45, collision: 23 },
  snack: { label: '간식 봉지', mass: .2, threshold: 15, score: 5, collision: 5 },
  shelf: { label: '스크린 옆 선반', mass: 14, threshold: 85, score: 45, collision: 28 },
  table: { label: '공용 테이블', mass: 23, threshold: 100, score: 70, collision: 30 },
  cup: { label: '컵', mass: .3, threshold: 18, score: 5, collision: 5 },
  book: { label: '책', mass: .6, threshold: 30, score: 5, collision: 7 },
  keyboard: { label: '키보드', mass: .5, threshold: 28, score: 10, collision: 8 },
  mouse: { label: '마우스', mass: .15, threshold: 18, score: 5, collision: 5 },
  panel: { label: '흡음 패널', mass: 12, threshold: 240, score: 60, collision: 65 },
  light: { label: '천장 조명', mass: 5, threshold: 120, score: 40, collision: 30 },
  anchorDesk: { label: '곡선 아나운서 데스크', mass: 60, threshold: 180, score: 110, collision: 46 },
  metalCabinet: { label: '철제 장비 캐비닛', mass: 40, threshold: 150, score: 70, collision: 40 },
  floorSofa: { label: '검은 좌식 소파', mass: 22, threshold: 95, score: 45, collision: 30 },
  paSpeaker: { label: '대형 PA 스피커', mass: 24, threshold: 110, score: 60, collision: 32 },
  metalShelf: { label: '철제 선반과 쿠션', mass: 12, threshold: 80, score: 40, collision: 26 },
  extinguisher: { label: '소화기', mass: 4, threshold: 40, score: 25, collision: 15 },
  foldingChair: { label: '접이식 의자', mass: 5, threshold: 45, score: 15, collision: 18 },
  sledChair: { label: '회색 패브릭 의자', mass: 8, threshold: 60, score: 20, collision: 22 },
  micStand: { label: '붐 마이크 스탠드', mass: 4, threshold: 40, score: 35, collision: 15 },
  ottoman: { label: '가죽 스툴', mass: 6, threshold: 50, score: 15, collision: 20 },
  floorCushion: { label: '바닥 방석', mass: 3, threshold: 35, score: 10, collision: 12 },
  sideTable: { label: '원형 사이드 테이블', mass: 5, threshold: 45, score: 20, collision: 18 },
  ampRack: { label: '스탠드 앰프', mass: 9, threshold: 65, score: 45, collision: 22 },
  headphones: { label: '모니터 헤드폰', mass: .4, threshold: 20, score: 15, collision: 6 },
  equipmentStack: { label: 'VCR·트라이캐스터 장비장', mass: 28, threshold: 120, score: 85, collision: 34 },
  waterPurifier: { label: '정수기', mass: 18, threshold: 90, score: 55, collision: 28 },
  wallSegment: { label: '벽', mass: 400, threshold: 420, score: 80, collision: 999 },
  windowWall: { label: '복도 쪽 창문', mass: 300, threshold: 240, score: 90, collision: 999 },
  door: { label: '문', mass: 60, threshold: 170, score: 70, collision: 999 },
  whiteboard: { label: '화이트보드', mass: 8, threshold: 45, score: 40, collision: 999 },
  chalkboard: { label: '초록 칠판', mass: 12, threshold: 55, score: 45, collision: 999 },
  projectorScreen: { label: '빔 스크린', mass: 6, threshold: 40, score: 40, collision: 999 },
  wallClock: { label: '벽시계', mass: 1, threshold: 18, score: 25, collision: 999 },
  wireBoard: { label: '철망 메모판', mass: 2, threshold: 22, score: 15, collision: 999 },
  poster: { label: '포스터', mass: .3, threshold: 10, score: 10, collision: 999 },
  glassPane: { label: '관찰창 유리', mass: 30, threshold: 60, score: 80, collision: 999 },
};

let nextId = 0;
const items: Item[] = [];
function add(kind: Kind, pos: Item['pos'], options: Partial<Item> = {}) {
  const item = { id: `${kind}-${++nextId}`, kind, pos, ...options }; items.push(item); return item;
}
// 위치는 사용자가 제공한 평면도의 가구 영역(276..965, 466..833)을 정규화한다.
export function planPoint(x: number, y: number): Item['pos'] {
  return [(x - 620.5) / 689 * ROOM.width, 0, (y - 649.5) / 367 * ROOM.depth];
}
function at(kind: Kind, x: number, y: number, options: Partial<Item> = {}) { return add(kind, planPoint(x, y), options); }
const desks = [
  { x: 541, y: 539, width: 1.9, depth: .9, rotation: 0 },
  { x: 729, y: 537, width: 1.6, depth: .9, rotation: 0 },
  { x: 840, y: 537, width: 1.6, depth: .9, rotation: 0 },
  { x: 886, y: 624, width: 1.8, depth: .8, rotation: -Math.PI / 2 },
  { x: 670, y: 807, width: 2.2, depth: .8, rotation: Math.PI, snackCounter: true },
  { x: 798, y: 770, width: 1.4, depth: .75, rotation: Math.PI },
  { x: 886, y: 768, width: 1.25, depth: .8, rotation: -Math.PI / 2 },
];
for (const [i, desk] of desks.entries()) {
  const pos = planPoint(desk.x, desk.y), a = desk.rotation;
  const deskItem = at('desk', desk.x, desk.y, desk);
  const offset = (dx: number, dz: number, y: number): Item['pos'] => [pos[0] + dx * Math.cos(a) + dz * Math.sin(a), y, pos[2] - dx * Math.sin(a) + dz * Math.cos(a)];
  if (desk.snackCounter) {
    add('coffee', offset(-.6, -.03, .8), { rotation: a, parentId: deskItem.id });
    add('microwave', offset(.24, -.04, .8), { rotation: a, parentId: deskItem.id });
    for (const [index, x] of [-.28, .18, .68].entries()) add('snack', offset(x, .25, .8), { color: ['#bd4736', '#dcad49', '#688f64'][index], parentId: deskItem.id });
    add('cup', offset(-.65, .25, .8), { parentId: deskItem.id });
    continue;
  }
  add('monitor', offset(0, .06, .8), { rotation: a + Math.PI, parentId: deskItem.id });
  add('keyboard', offset(0, -.28, .8), { rotation: a + Math.PI, parentId: deskItem.id });
  add('mouse', offset(.36, -.28, .8), { parentId: deskItem.id });
  add('cup', offset(-.35, .05, .8), { parentId: deskItem.id });
  add('book', offset(.5, .12, .8), { color: ['#b5c6cb', '#b9bd94', '#b69985'][i % 3], parentId: deskItem.id });
  // 소파가 의자를 겸하는 책상에는 의자를 겹쳐 놓지 않는다.
  if ([1, 5].includes(i)) add('chair', offset(0, -(desk.depth / 2 + .55), 0), { rotation: a });
}
at('sofa', 522, 598, { width: 1.8, color: '#d7d4bc' });
at('sofa', 834, 628, { width: 1.8, rotation: -Math.PI / 2, color: '#d7d4bc' });
const sharedTableItem = at('table', 670, 685, { width: 2.6, depth: 1.25, color: '#ebe8df', trim: '#8a6a52' });
at('bench', 676, 625, { width: 2.1, depth: .35, rotation: Math.PI });
at('bench', 670, 752, { width: 2.2, depth: .42 });
at('sofa', 551, 697, { width: 2.3, rotation: Math.PI / 2, color: '#b5524a', curved: true });
const sharedTable = planPoint(670, 685);
add('laptop', [sharedTable[0] - .26, .8, sharedTable[2] - .18], { parentId: sharedTableItem.id });
add('laptop', [sharedTable[0] + .46, .8, sharedTable[2] + .17], { rotation: Math.PI, parentId: sharedTableItem.id });
add('cup', [sharedTable[0] + .41, .8, sharedTable[2] - .36], { parentId: sharedTableItem.id });
add('book', [sharedTable[0] - .73, .8, sharedTable[2] + .24], { color: '#bd744b', parentId: sharedTableItem.id });
// 최종 방향 정정: 사용자가 올린 평면도의 왼쪽 벽. 스크린은 아래쪽 벽에 유지한다.
add('fridge', [-ROOM.width / 2 + .33, 0, -ROOM.depth / 2 + 3.35], { rotation: Math.PI / 2 });
add('cabinet', [-ROOM.width / 2 + .28, 0, -ROOM.depth / 2 + 2.6], { rotation: Math.PI / 2 });
for (const z of [.8, 1.75]) add('wardrobe', [-ROOM.width / 2 + .33, 0, -ROOM.depth / 2 + z], { width: .94, rotation: Math.PI / 2 });
// 추가 정면 사진: 스크린과 검은 게시판 사이의 검은 금속 선반.
add('shelf', [ROOM.width * .2, 0, ROOM.depth / 2 - .23], { rotation: Math.PI });
add('printer', [ROOM.width / 2 - .4, 0, ROOM.depth * (.85 / 5.8)], { rotation: -Math.PI / 2 });
add('stand', [ROOM.width * (3.85 / 10.5), 0, ROOM.depth * (.88 / 5.8)], { rotation: -Math.PI / 2 });
for (const x of [-1.2, -.4, .4]) add('panel', [x, 1.44, -ROOM.depth / 2 + .04], { fixed: true });
for (const x of [-.307, 0, .307]) for (const z of [-.223, .223]) add('light', [x * ROOM.width, 2.7, z * ROOM.depth], { fixed: true });
// 기존 ID를 유지하도록 새 가구는 마지막에 추가한다. 삭제된 desk-20의 칸막이를 독립 가구로 복원.
const partitionDesk = items.find(item => item.id === 'desk-20')!;
add('partition', [partitionDesk.pos[0] + .39, 0, partitionDesk.pos[2]], { width: 1.8, rotation: -Math.PI / 2 });
// ── 기술부스·아나부스: 사용자가 보낸 실내 사진 기준 배치 (실측 전 추정치) ──
const W = BOOTH_WALL_Z, P = .12; // P: 기술부스 이중바닥 높이
const TOP = P + .8; // 방송 작업대 상판 높이
// 기술부스: 관찰창 앞 주황 콘솔 + 왼쪽 JD-MEDIA 랙 + 오른쪽 상자 책상, 메인룸 쪽 벽에는 CD 유리장.
const console_ = add('desk', [2.4, P, W + .6], { width: 4.2, depth: 1.05, broadcastDesk: true, color: '#c1652d' });
add('mixer', [3.55, TOP, W + .62], { parentId: console_.id, scale: .55 });
add('monitor', [1.05, TOP, W + .35], { parentId: console_.id, scale: .78 });
add('monitor', [2.2, TOP, W + .35], { parentId: console_.id, scale: .7 });
add('keyboard', [1.05, TOP, W + .85], { parentId: console_.id, color: '#d3d3cc' });
add('mouse', [1.5, TOP, W + .85], { parentId: console_.id });
add('microphone', [2.85, TOP, W + .5], { parentId: console_.id, rotation: Math.PI, scale: .8 });
add('book', [.55, TOP, W + .75], { parentId: console_.id, color: '#cf4a44' });
for (const x of [BOOTH_WINDOW.x - BOOTH_WINDOW.width / 2 - .05, BOOTH_WINDOW.x + BOOTH_WINDOW.width / 2 + .05]) add('speaker', [x, 2.18, W + .22]);
add('rack', [-1.55, P, W + .5], { height: 2.3, width: .85, depth: .78 });
add('equipmentStack', [-.55, P, W + .42]);
add('monitor', [-.55, P + .95, W + .4], { scale: .72 });
add('keyboard', [-.62, P + .8, W + .95], { color: '#d3d3cc' });
add('chair', [2.0, P, W + 1.65], { color: '#4e7e9b', rotation: Math.PI });
const sideDesk = add('desk', [5.6, P, W + .6], { width: 2.4, depth: 1.05, broadcastDesk: true, color: '#c1652d' });
add('carton', [5.25, TOP, W + .5], { parentId: sideDesk.id, width: .62, height: .42 });
add('carton', [5.25, TOP + .42, W + .5], { parentId: sideDesk.id, width: .55, height: .3 });
add('carton', [6.2, TOP, W + .45], { parentId: sideDesk.id, width: .55, height: .55 });
for (const [index, x] of [-.95, .45, 1.9].entries()) add('mediaCabinet', [x, P, STUDIO_START - .32], { width: index === 0 ? 1.15 : 1.35, color: index === 2 ? '#d6c49a' : '#a96e31', rotation: Math.PI });
add('carton', [1.9, P + 2.15, STUDIO_START - .32], { width: .7, height: .38 });
add('carton', [.45, P + 2.15, STUDIO_START - .35], { width: .5, height: .3 });
const spareDesk = add('desk', [6.45, P, -6.9], { width: 1.65, depth: .7, broadcastDesk: true, color: '#b36c3c', rotation: -Math.PI / 2 });
add('mixer', [6.45, TOP, -6.9], { parentId: spareDesk.id, scale: .8, rotation: -Math.PI / 2 });
add('carton', [-6.55, 0, -7.6], { width: .55, height: .4 });
for (const x of [-1.5, 1.5, 4.5]) for (const z of [-6, -8.6]) add('light', [x, 2.72, z], { fixed: true });
// 아나부스: 관찰창 앞 곡선 데스크, 왼쪽 원형 테이블+스피커, 창 오른쪽 철제 캐비닛·좌식 소파,
// 맞은편 벽에 PA 스피커 더미, 쿠션 선반, 소화기, LED 조명, 대리석 테이블.
const anchor = add('anchorDesk', [BOOTH_WINDOW.x, 0, W - .75], { width: 2.5, rotation: Math.PI });
add('monitor', [BOOTH_WINDOW.x + .55, .79, W - .58], { parentId: anchor.id, rotation: Math.PI, scale: .62 });
add('monitor', [BOOTH_WINDOW.x - .55, .79, W - .58], { parentId: anchor.id, rotation: Math.PI, scale: .62 });
add('keyboard', [BOOTH_WINDOW.x + .45, .79, W - .9], { parentId: anchor.id, rotation: Math.PI });
add('headphones', [BOOTH_WINDOW.x - .25, .79, W - .92], { parentId: anchor.id });
add('headphones', [BOOTH_WINDOW.x + 1.0, .79, W - .9], { parentId: anchor.id, rotation: .5 });
add('micStand', [BOOTH_WINDOW.x + .95, 0, W - 1.55], { rotation: Math.PI * .85 });
add('sledChair', [BOOTH_WINDOW.x + .2, 0, W - 1.75]);
add('sideTable', [BOOTH_WINDOW.x + 2.15, 0, W - .5]);
add('paSpeaker', [BOOTH_WINDOW.x + 2.15, .52, W - .5], { width: .46, height: .62, depth: .42, rotation: Math.PI * .92 });
add('metalCabinet', [-.85, 0, W - .4], { rotation: Math.PI });
add('floorSofa', [-2.75, 0, W - .6], { width: 1.55, rotation: Math.PI });
add('ottoman', [-3.3, 0, W - 2.2]);
add('floorCushion', [-6.55, 0, W - 1.7]);
const far = STUDIO_END;
add('paSpeaker', [-6.35, 0, far + .4], { width: .62, height: 1.05, depth: .55 });
add('paSpeaker', [-5.7, 0, far + .4], { width: .58, height: 1.0, depth: .55 });
add('paSpeaker', [-6.35, 1.05, far + .4], { width: .5, height: .68, depth: .5 });
add('carton', [-5.7, 1.0, far + .4], { width: .5, height: .2 });
add('extinguisher', [-5.15, 0, far + .3]);
add('metalShelf', [-4.55, 0, far + .3]);
add('stand', [.9, 0, far + .55], { rotation: Math.PI });
const marble = add('table', [2.2, 0, far + 1.3], { width: 1.5, depth: .75, color: '#e6e4de' });
add('book', [2.7, .8, far + 1.25], { parentId: marble.id, color: '#f1efe8' });
add('sledChair', [1.6, 0, far + .7], { color: '#9d9890' });
add('foldingChair', [3.6, 0, far + 1.1], { rotation: -Math.PI / 2 });
add('foldingChair', [-1.5, 0, far + 1.2]);
add('ampRack', [5.9, 0, far + .35]);
add('carton', [4.7, 0, far + .3], { width: .55, height: .45 });
for (const x of [-3.5, .5, 4.5]) for (const z of [W - 1.6, far + 1.8]) add('light', [x, 2.72, z], { fixed: true });
// 냉장고 옆 정수기 (사용자 요청). 기존 가구 ID를 지키려고 마지막에 추가한다.
add('waterPurifier', [-1.5, 0, ROOM.depth / 2 - .3], { rotation: Math.PI });
// ── 부술 수 있는 벽·문·벽 부착물 (모두 고정 물체, 기존 가구 ID 보존을 위해 마지막에 추가) ──
type Side = Extract<WallSide, 'back' | 'front' | 'left' | 'right'>;
const WALLS: Record<Side, { origin: [number, number]; angle: number; length: number }> = {
  back: { origin: [0, -ROOM.depth / 2], angle: 0, length: ROOM.width },
  front: { origin: [0, ROOM.depth / 2], angle: Math.PI, length: ROOM.width },
  left: { origin: [-ROOM.width / 2, 0], angle: Math.PI / 2, length: ROOM.depth },
  right: { origin: [ROOM.width / 2, 0], angle: -Math.PI / 2, length: ROOM.depth },
};
/** 벽 기준 좌표(lx: 벽을 따라, lz: 방 안쪽으로) → 세계 좌표. */
function wallPoint(side: Side, lx: number, y = 0, lz = 0): Item['pos'] {
  const { origin: [ox, oz], angle: a } = WALLS[side];
  return [ox + lx * Math.cos(a) + lz * Math.sin(a), y, oz - lx * Math.sin(a) + lz * Math.cos(a)];
}
const segments: { side: Side; x: number; width: number; item: Item }[] = [];
function wallRun(side: Side, from: number, to: number, extra: Partial<Item> = {}) {
  const n = Math.max(1, Math.ceil((to - from) / 1.8 - 1e-6)), width = (to - from) / n;
  for (let i = 0; i < n; i++) { const x = from + (i + .5) * width; segments.push({ side, x, width, item: add('wallSegment', wallPoint(side, x), { width, rotation: WALLS[side].angle, wall: side, fixed: true, ...extra }) }); }
}
function doorway(side: Side, x: number, door: Partial<Item>, extra: Partial<Item> = {}) {
  add('wallSegment', wallPoint(side, x), { width: 1.06, bottom: 2.18, jambs: true, rotation: WALLS[side].angle, wall: side, fixed: true, ...extra });
  add('door', wallPoint(side, x - .52, 0, .1), { rotation: WALLS[side].angle + (door.rotation ?? 0), wall: side, fixed: true, leather: door.leather });
}
function mount(kind: Kind, side: Side, lx: number, y: number, lz: number, extra: Partial<Item> = {}) {
  const parent = segments.find(seg => seg.side === side && Math.abs(seg.x - lx) <= seg.width / 2 + .01);
  return add(kind, wallPoint(side, lx, y, lz), { rotation: WALLS[side].angle, wall: side, fixed: true, parentId: parent?.item.id, ...extra });
}
const BACK_DOOR = -ROOM.width * .3125, LEFT_DOOR = -ROOM.depth * (1.32 / 4.7);
// 뒷벽(기술부스 쪽): 부스 쪽 면은 흡음 마감. 열린 주황 가죽 방음문.
wallRun('back', -ROOM.width / 2, BACK_DOOR - .53, { studioFace: true }); wallRun('back', BACK_DOOR + .53, ROOM.width / 2, { studioFace: true });
doorway('back', BACK_DOOR, { leather: true, rotation: -1.25 }, { studioFace: true });
// 앞벽(스크린 쪽), 왼쪽 벽(복도 문 · 닫힌 원목 문), 오른쪽 벽(복도 창 4개).
wallRun('front', -ROOM.width / 2, ROOM.width / 2);
wallRun('left', -ROOM.depth / 2, LEFT_DOOR - .53); wallRun('left', LEFT_DOOR + .53, ROOM.depth / 2);
doorway('left', LEFT_DOOR, {});
for (const x of [-3.285, -1.095, 1.095, 3.285]) segments.push({ side: 'right', x, width: 2.19, item: add('windowWall', wallPoint('right', x), { width: 2.19, rotation: WALLS.right.angle, wall: 'right', fixed: true }) });
for (const x of [-4.44, 4.44]) wallRun('right', x - .06, x + .06);
// 벽 부착물: 부서진 벽과 함께 떨어져 나간다(parentId).
mount('whiteboard', 'back', -1.3, 1.62, .15, { texture: 'rules' });
mount('whiteboard', 'back', .45, 1.62, .15, { texture: 'calendar' });
mount('wireBoard', 'back', 1.62, 1.68, .13);
mount('poster', 'back', -2.65, 1.62, .13);
mount('projectorScreen', 'front', BACK_DOOR, 1.68, .15);
// 간식 책상(desk-26, x≈1.0) 바로 위로 칠판을 맞춘다. 앞벽은 180° 돌아 있어 벽 좌표는 부호가 반대다.
mount('chalkboard', 'front', -1.005806, 1.62, .13);
mount('wallClock', 'right', 0, 2.28, .2);
// 기술부스↔아나부스: 방음문과 관찰창 이중 유리.
add('door', [BOOTH_DOOR.x - BOOTH_DOOR.width / 2 + .02, 0, BOOTH_WALL_Z + .06], { rotation: -1.05, wall: 'booth', fixed: true, leather: true });
add('glassPane', [BOOTH_WINDOW.x, (BOOTH_WINDOW.bottom + BOOTH_WINDOW.top) / 2, BOOTH_WALL_Z], { width: BOOTH_WINDOW.width, height: BOOTH_WINDOW.top - BOOTH_WINDOW.bottom, wall: 'booth', fixed: true, jambs: true });
// 부스 흡음벽(부스 사이 벽 · 아나부스 맞은편 벽 · 부스 양옆 벽)도 부술 수 있다.
function boothRun(from: number, to: number, place: (x: number, width: number) => Partial<Item>, max = 1.9) {
  const n = Math.max(1, Math.ceil((to - from) / max - 1e-6)), width = (to - from) / n;
  for (let i = 0; i < n; i++) { const x = from + (i + .5) * width; add('wallSegment', [0, 0, 0], { width, fixed: true, ...place(x, width) }); }
}
const DOOR_L = BOOTH_DOOR.x - BOOTH_DOOR.width / 2, DOOR_R = BOOTH_DOOR.x + BOOTH_DOOR.width / 2;
const WIN_L = BOOTH_WINDOW.x - BOOTH_WINDOW.width / 2, WIN_R = BOOTH_WINDOW.x + BOOTH_WINDOW.width / 2;
const booth = (x: number): Partial<Item> => ({ pos: [x, 0, BOOTH_WALL_Z], wall: 'booth', acoustic: 'both' });
for (const [a, b] of [[-ROOM.width / 2, DOOR_L], [DOOR_R, WIN_L], [WIN_R, ROOM.width / 2]] as const) boothRun(a, b, booth);
add('wallSegment', [BOOTH_DOOR.x, 0, BOOTH_WALL_Z], { width: BOOTH_DOOR.width, bottom: 2.1, jambs: true, wall: 'booth', acoustic: 'both', fixed: true });
add('wallSegment', [BOOTH_WINDOW.x, 0, BOOTH_WALL_Z], { width: BOOTH_WINDOW.width, height: BOOTH_WINDOW.bottom, wall: 'booth', acoustic: 'both', fixed: true });
add('wallSegment', [BOOTH_WINDOW.x, 0, BOOTH_WALL_Z], { width: BOOTH_WINDOW.width, bottom: BOOTH_WINDOW.top, wall: 'booth', acoustic: 'both', fixed: true });
boothRun(-ROOM.width / 2, ROOM.width / 2, x => ({ pos: [x, 0, STUDIO_END - .06], wall: 'outer', acoustic: 'front' }));
for (const sign of [-1, 1]) boothRun(STUDIO_END, STUDIO_START, z => ({ pos: [sign * ROOM.width / 2, 0, z], rotation: sign < 0 ? Math.PI / 2 : -Math.PI / 2, wall: sign < 0 ? 'studioLeft' : 'studioRight', acoustic: 'front' }));
// 예전 뒷벽 흡음판 3장은 새 벽 패널과 겹치므로 목록에서 뺀다(다른 가구 ID는 그대로 유지된다).
for (let i = items.length - 1; i >= 0; i--) if (items[i].kind === 'panel') items.splice(i, 1);
// 너무 쉽게 깨지지 않도록 모든 가구의 내구도를 2배로 (금·가루가 충분히 쌓인 뒤 깨진다).
for (const spec of Object.values(specs)) spec.threshold *= 2;
export const DEFAULT_ITEMS = items;
// /edit에서 이 브라우저에 저장한 배치가 있으면 그것을 쓰고, 문제가 있으면 기본 저장 배치로 돌아간다.
function chooseLayout() {
  const local = readLocalLayout();
  if (local) try { return applyLayout(DEFAULT_ITEMS, local); } catch { /* 오래된 배치는 무시 */ }
  return applyLayout(DEFAULT_ITEMS, savedLayout);
}
export const ITEMS = chooseLayout();
export const TOTAL = ITEMS.length;
