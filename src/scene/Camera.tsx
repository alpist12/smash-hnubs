import { useEffect, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { MOUSE, TOUCH, Vector3, PerspectiveCamera } from 'three';
import type { OrbitControls as OrbitImpl } from 'three-stdlib';
import { useGame } from '../game/store';
import { aim } from '../physics/attacks';
import { STUDIOS, WORLD } from '../data/studios';
import { ROOM } from '../data/room';

export function CameraRig() {
  const controls = useRef<OrbitImpl>(null), { camera, size } = useThree();
  const request = useGame(s => s.cameraRequest), mode = useGame(s => s.cameraMode);
  const transition = useRef(1), start = useRef(new Vector3()), goal = useRef(new Vector3());
  const previousShake = useRef(new Vector3());
  const keys = useRef(new Set<string>());
  useEffect(() => {
    const typing = (e: KeyboardEvent) => e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement;
    const down = (e: KeyboardEvent) => { if (!typing(e) && !e.ctrlKey && !e.metaKey && !e.altKey) keys.current.add(e.code); };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code), clear = () => keys.current.clear();
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', clear);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear); };
  }, []);
  /** WASD·방향키: 바라보는 방향 기준 수평 이동, Q/E: 좌우 회전, Shift: 빠르게. */
  function moveWithKeys(delta: number) {
    const k = keys.current, c = controls.current;
    if (!c || !k.size) return;
    const forward = new Vector3(); camera.getWorldDirection(forward); forward.y = 0;
    if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
    forward.normalize();
    const right = new Vector3().crossVectors(forward, new Vector3(0, 1, 0)), move = new Vector3();
    if (k.has('KeyW') || k.has('ArrowUp')) move.add(forward);
    if (k.has('KeyS') || k.has('ArrowDown')) move.sub(forward);
    if (k.has('KeyD') || k.has('ArrowRight')) move.add(right);
    if (k.has('KeyA') || k.has('ArrowLeft')) move.sub(right);
    const speed = (k.has('ShiftLeft') || k.has('ShiftRight') ? 12 : 5.5) * Math.max(.6, camera.position.distanceTo(c.target) / 10);
    if (move.lengthSq() > 0) { move.normalize().multiplyScalar(speed * delta); camera.position.add(move); c.target.add(move); transition.current = 1; }
    const turn = (k.has('KeyE') ? 1 : 0) - (k.has('KeyQ') ? 1 : 0);
    if (turn) { const offset = camera.position.clone().sub(c.target).applyAxisAngle(new Vector3(0, 1, 0), -turn * 1.6 * delta); camera.position.copy(c.target).add(offset); transition.current = 1; }
    c.update();
  }
  useEffect(() => {
    if (!controls.current) return;
    start.current.copy(camera.position); transition.current = 0;
    const portrait = size.width / size.height < 1;
    const distance = ROOM.width / 8.8 * (portrait ? Math.max(1, .95 / (size.width / size.height)) : 1);
    if (camera instanceof PerspectiveCamera) { camera.fov = portrait ? 45 : 36; camera.updateProjectionMatrix(); }
    goal.current.set(...(mode === 'top' ? [0, 24 * distance, WORLD.centerZ + 2.01] : mode === 'photo' ? [2.5 * distance, 6.5 * distance, -13.5 * distance] : [7.2 * distance, 7.65 * distance, 9.45 * distance]) as [number, number, number]);
    const studio = STUDIOS.find(studio => studio.id === mode);
    if (studio) goal.current.set(5.5 * distance, 5.5 * distance, studio.centerZ + 5.5 * distance);
    controls.current.target.set(0, .3, studio ? studio.centerZ : mode === 'top' ? WORLD.centerZ + 2 : 0); controls.current.update();
  }, [camera, request, mode, size.width, size.height]);
  useFrame((_, delta) => {
    if (!controls.current) return;
    camera.position.sub(previousShake.current); previousShake.current.set(0, 0, 0);
    if (transition.current < 1) {
      transition.current = Math.min(1, transition.current + delta * 2.6);
      const t = transition.current;
      camera.position.lerpVectors(start.current, goal.current, 1 - (1 - t) ** 3); camera.lookAt(controls.current.target); controls.current.update();
    }
    moveWithKeys(delta);
    controls.current.target.clamp(new Vector3(-8, 0, WORLD.minZ - .5), new Vector3(8, 2.4, WORLD.maxZ + .5));
    controls.current.enableRotate = !(useGame.getState().weapon === 'laser' && aim.holding);
    if (aim.shake > .001 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const s = aim.shake; previousShake.current.set(Math.sin(performance.now() * .1) * s, Math.cos(performance.now() * .13) * s, 0);
      camera.position.add(previousShake.current); aim.shake *= Math.exp(-delta * 10);
    }
  });
  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={.09} minDistance={1.2} maxDistance={60} minPolarAngle={.015} maxPolarAngle={Math.PI / 2.03} zoomToCursor screenSpacePanning={false} rotateSpeed={.8} zoomSpeed={1.15} panSpeed={1.2} mouseButtons={{ LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }} touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }} onStart={() => { transition.current = 1; }} />;
}
