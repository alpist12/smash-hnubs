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
    controls.current.target.clamp(new Vector3(-5.5, 0, WORLD.minZ + 1), new Vector3(5.5, 1, WORLD.maxZ - 1));
    controls.current.enableRotate = !(useGame.getState().weapon === 'laser' && aim.holding);
    if (aim.shake > .001 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const s = aim.shake; previousShake.current.set(Math.sin(performance.now() * .1) * s, Math.cos(performance.now() * .13) * s, 0);
      camera.position.add(previousShake.current); aim.shake *= Math.exp(-delta * 10);
    }
  });
  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={.1} minDistance={5.5} maxDistance={64} minPolarAngle={.015} maxPolarAngle={Math.PI / 2.15} mouseButtons={{ LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }} touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }} onStart={() => { transition.current = 1; }} />;
}
