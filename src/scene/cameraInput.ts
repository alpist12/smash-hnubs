/** 화면 버튼(누르고 있기)·더블클릭 이동 입력. HUD가 3D 엔진을 불러오지 않도록 별도 모듈로 둔다. */
export const cameraInput = { zoom: 0, rotate: 0, focus: null as [number, number, number] | null };
export function focusOn(point: [number, number, number]) { cameraInput.focus = [point[0], 0, point[2]]; }
