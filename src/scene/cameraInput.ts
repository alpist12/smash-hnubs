/** 화면 버튼(누르고 있기)·더블클릭 이동 입력. HUD가 3D 엔진을 불러오지 않도록 별도 모듈로 둔다. */
export const cameraInput = { zoom: 0, rotate: 0, focus: null as [number, number, number] | null };
export function focusOn(point: [number, number, number]) { cameraInput.focus = [point[0], 0, point[2]]; }

export const CAMERA_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'KeyQ', 'KeyE', 'ShiftLeft', 'ShiftRight']);
/** WASD orbits the view; arrow keys pan horizontally relative to the view. */
export function cameraKeyMotion(keys: ReadonlySet<string>, forwardX: number, forwardZ: number, delta: number, distance: number) {
  const length = Math.hypot(forwardX, forwardZ);
  const fx = length > 1e-6 ? forwardX / length : 0, fz = length > 1e-6 ? forwardZ / length : -1;
  const front = Number(keys.has('ArrowUp')) - Number(keys.has('ArrowDown'));
  const side = Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft'));
  const norm = Math.hypot(front, side) || 1, dt = Math.min(.1, Math.max(0, delta));
  const fast = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 2 : 1;
  const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 12 : 5.5) * Math.max(.6, distance / 10) * dt / norm;
  return { x: (fx * front - fz * side) * speed, z: (fz * front + fx * side) * speed,
    turn: (Number(keys.has('KeyD') || keys.has('KeyE')) - Number(keys.has('KeyA') || keys.has('KeyQ'))) * 1.6 * dt * fast,
    tilt: (Number(keys.has('KeyS')) - Number(keys.has('KeyW'))) * 1.3 * dt * fast };
}
