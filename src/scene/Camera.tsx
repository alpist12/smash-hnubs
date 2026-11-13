import { useEffect, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { MOUSE, TOUCH, Vector3, Spherical, PerspectiveCamera } from 'three';
import type { OrbitControls as OrbitImpl } from 'three-stdlib';
import { useGame } from '../game/store';
import { cameraInput, CAMERA_KEYS, cameraKeyMotion } from './cameraInput';
import { targets, aim } from '../physics/attacks';
import { STUDIOS, WORLD } from '../data/studios';
import { CHARACTERS } from '../data/characters';
import { ROOM } from '../data/room';
import { meteorPosition, meteorProgress } from '../data/meteor';

export function CameraRig() {
  const controls = useRef<OrbitImpl>(null), { camera, size } = useThree();
  const request = useGame(s => s.cameraRequest), mode = useGame(s => s.cameraMode);
  const transition = useRef(1), start = useRef(new Vector3()), goal = useRef(new Vector3());
  const previousShake = useRef(new Vector3());
  const cinematic = useRef<{ position: Vector3; target: Vector3 } | null>(null);
  const keys = useRef(new Set<string>()), followCharacter = useRef(false);
  useEffect(() => {
    const typing = (e: KeyboardEvent) => e.target instanceof Element && !!e.target.closest('input, select, textarea, [contenteditable="true"]');
    const down = (e: KeyboardEvent) => { if (CAMERA_KEYS.has(e.code) && !typing(e) && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); keys.current.add(e.code); } };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code), clear = () => keys.current.clear();
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', clear); document.addEventListener('visibilitychange', clear); document.addEventListener('focusin', clear);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', clear); document.removeEventListener('focusin', clear); };
  }, []);
  /** WASD: 시점 회전, 방향키: 수평 이동. */
  function moveWithKeys(delta: number) {
    const k = keys.current, c = controls.current;
    if (!c || !k.size) return;
    const forward = new Vector3(); camera.getWorldDirection(forward);
    const motion = cameraKeyMotion(k, forward.x, forward.z, delta, camera.position.distanceTo(c.target));
    if (motion.x || motion.z) {
      const move = new Vector3(motion.x, 0, motion.z);
      camera.position.add(move); c.target.add(move); transition.current = 1; cameraInput.focus = null; followCharacter.current = false;
    }
    if (motion.turn || motion.tilt) {
      followCharacter.current = false;
      const orbit = new Spherical().setFromVector3(camera.position.clone().sub(c.target));
      orbit.theta += motion.turn;
      orbit.phi = Math.max(.015, Math.min(Math.PI / 2.03, orbit.phi + motion.tilt));
      camera.position.copy(c.target).add(new Vector3().setFromSpherical(orbit)); transition.current = 1;
    }
    c.update();
  }
  useEffect(() => {
    if (!controls.current) return;
    followCharacter.current = CHARACTERS.some(profile => profile.camera === mode);
    start.current.copy(camera.position); transition.current = 0;
    const portrait = size.width / size.height < 1;
    const distance = ROOM.width / 8.8 * (portrait ? Math.max(1, .95 / (size.width / size.height)) : 1);
    if (camera instanceof PerspectiveCamera) { camera.fov = portrait ? 45 : 36; camera.updateProjectionMatrix(); }
    goal.current.set(...(mode === 'top' ? [0, 24 * distance, WORLD.centerZ + 2.01] : mode === 'photo' ? [2.5 * distance, 6.5 * distance, -13.5 * distance] : [7.2 * distance, 7.65 * distance, 9.45 * distance]) as [number, number, number]);
    const studio = STUDIOS.find(studio => studio.id === mode);
    if (studio) goal.current.set(5.5 * distance, 5.5 * distance, studio.centerZ + (mode === 'technical' ? 1.6 : 5.5 * distance));
    controls.current.target.set(0, .3, studio ? studio.centerZ : mode === 'top' ? WORLD.centerZ + 2 : 0); controls.current.update();
    const character = CHARACTERS.find(profile => profile.camera === mode);
    if (character) {
      const actor = targets.get(character.id);
      const p = actor?.point() ?? new Vector3(character.pos[0], character.pos[1] + 1.1, character.pos[2]);
      const facing = actor?.facing?.() ?? .22, range = portrait ? 4.5 : 3.7;
      controls.current.target.copy(p); goal.current.copy(p).add(new Vector3(Math.sin(facing)*range+Math.cos(facing)*.5, .65, Math.cos(facing)*range-Math.sin(facing)*.5));
    }
  }, [camera, request, mode, size.width, size.height]);
  useFrame((_, delta) => {
    if (!controls.current) return;
    camera.position.sub(previousShake.current); previousShake.current.set(0, 0, 0);
    const strike = useGame.getState().meteor;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced && (strike || cinematic.current)) {
      const c = controls.current;
      c.enabled = false;
      if (strike && !cinematic.current) cinematic.current = { position: camera.position.clone(), target: c.target.clone() };
      const saved = cinematic.current!;
      let desired = saved.position, target = saved.target;
      if (strike) {
        const progress=meteorProgress(strike,performance.now());
        const reveal=Math.max(0,Math.min(1,(progress-.48)/.4)), blend=reveal*reveal*(3-2*reveal);
        const rock=new Vector3(...meteorPosition(strike.point,progress));
        const wide=new Vector3(strike.point[0]+9,strike.point[1]+10,strike.point[2]+(size.width<size.height?24:13));
        desired=rock.clone().add(new Vector3(2.1,1.1,size.width<size.height?5.6:4.6)).lerp(wide,blend);
        target=rock.clone().lerp(new Vector3(strike.point[0],strike.point[1]+1.2,strike.point[2]),blend);
      }
      const k = 1-Math.exp(-delta*(strike?8:5));
      camera.position.lerp(desired,k);c.target.lerp(target,k);c.update();
      transition.current=1;
      if (!strike && camera.position.distanceTo(saved.position)<.03) { camera.position.copy(saved.position);c.target.copy(saved.target);cinematic.current=null;c.enabled=true; }
      if (aim.shake>.001) { const s=aim.shake;previousShake.current.set(Math.sin(performance.now()*.1)*s,Math.cos(performance.now()*.13)*s,0);camera.position.add(previousShake.current);aim.shake*=Math.exp(-delta*3.5); }
      return;
    }
    controls.current.enabled = true;
    if (transition.current < 1) {
      transition.current = Math.min(1, transition.current + delta * 2.6);
      const t = transition.current;
      camera.position.lerpVectors(start.current, goal.current, 1 - (1 - t) ** 3); camera.lookAt(controls.current.target); controls.current.update();
    }
    if (followCharacter.current && transition.current >= 1) {
      const character = CHARACTERS.find(profile => profile.camera === mode);
      const point = character ? targets.get(character.id)?.point() : undefined;
      if (point) {
        const move = point.sub(controls.current.target).multiplyScalar(1 - Math.exp(-delta * 5));
        controls.current.target.add(move); camera.position.add(move); controls.current.update();
      }
    }
    moveWithKeys(delta);
    const c = controls.current;
    if (cameraInput.zoom || cameraInput.rotate) {
      const offset = camera.position.clone().sub(c.target);
      if (cameraInput.rotate) offset.applyAxisAngle(new Vector3(0, 1, 0), cameraInput.rotate * 1.5 * delta);
      if (cameraInput.zoom) offset.multiplyScalar(Math.min(60 / offset.length(), Math.max(1.4 / offset.length(), Math.exp(-cameraInput.zoom * 1.4 * delta))));
      camera.position.copy(c.target).add(offset); transition.current = 1; c.update();
    }
    if (cameraInput.focus) {
      followCharacter.current = false;
      // 더블클릭한 곳으로 시선을 부드럽게 옮기고 조금 다가간다.
      const focus = new Vector3(...cameraInput.focus), step = 1 - Math.exp(-delta * 7), move = focus.clone().sub(c.target).multiplyScalar(step);
      c.target.add(move); camera.position.add(move);
      const offset = camera.position.clone().sub(c.target), goal = Math.max(3.2, Math.min(offset.length(), 7));
      offset.setLength(offset.length() + (goal - offset.length()) * step); camera.position.copy(c.target).add(offset);
      transition.current = 1; c.update();
      if (focus.distanceTo(c.target) < .02) cameraInput.focus = null;
    }
    const beforeClamp = controls.current.target.clone();
    controls.current.target.clamp(new Vector3(-8, 0, WORLD.minZ - .5), new Vector3(8, 2.4, WORLD.maxZ + .5));
    camera.position.add(controls.current.target.clone().sub(beforeClamp));
    controls.current.enableRotate = !(useGame.getState().weapon === 'laser' && aim.holding);
    if (aim.shake > .001 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const s = aim.shake; previousShake.current.set(Math.sin(performance.now() * .1) * s, Math.cos(performance.now() * .13) * s, 0);
      camera.position.add(previousShake.current); aim.shake *= Math.exp(-delta * 10);
    }
  });
  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={.09} minDistance={1.2} maxDistance={60} minPolarAngle={.015} maxPolarAngle={Math.PI / 2.03} zoomToCursor screenSpacePanning={false} rotateSpeed={.8} zoomSpeed={1.15} panSpeed={1.2} mouseButtons={{ LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }} touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }} onStart={() => { transition.current = 1; followCharacter.current = false; }} />;
}
