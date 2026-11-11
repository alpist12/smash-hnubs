// 사진 기반 추정치. 메인룸 뒷벽(z=-4.5)에서 기술부스 → 아나부스 순으로 이어진다.
export const STUDIOS = [
  { id: 'technical', label: '기술부스', centerZ: -7.25, depth: 5.5, color: '#658782' },
  { id: 'announcer', label: '아나부스', centerZ: -13, depth: 6, color: '#9e7c65' },
] as const;
export const STUDIO_START = -4.5;
export const STUDIO_END = -16;
// 기술부스↔아나부스 사이 벽: 왼쪽 방음문, 오른쪽으로 치우친 관찰창.
export const BOOTH_WALL_Z = -10;
export const BOOTH_DOOR = { x: -4.375, width: 1.05 };
export const BOOTH_WINDOW = { x: 1.6, width: 3.2, bottom: 1.04, top: 2.14 };
// 기술부스 왼쪽 카펫 통로(낮은 바닥)와 오른쪽 이중바닥 타일 단의 경계.
export const PLATFORM_EDGE_X = -3.82;
export const WORLD = { width: 14, depth: 4.5 - STUDIO_END, height: 2.8, minZ: STUDIO_END, maxZ: 4.5, centerZ: (4.5 + STUDIO_END) / 2 };
