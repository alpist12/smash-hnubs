import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, Box3, DoubleSide, Euler, Group, Material, Mesh, MeshBasicMaterial, Plane, PointLight, Quaternion, Vector3 } from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

const turn = new Quaternion(), angles = new Euler();
import { useGame } from '../game/store';
import { stopSnap } from '../game/audio';
import snap from '../weapons/snap';
import type { SnapStrike } from '../data/snap';
import { SnapDust } from './SnapDust';
import { DRACO } from './draco';

const URL = `${import.meta.env.BASE_URL}models/thanos/thanos.glb`, HEIGHT = 2.5;
/** 포털이 지나가는 앞뒤 위치(타노스 기준 앞쪽 +). 몸 두께(±0.5m)를 완전히 덮는다. */
const BACK = -.75, FRONT = .85;
const FINGERS = ['Middle', 'Index', 'Ring', 'Pinky', 'Thumb'] as const;
type Finger = typeof FINGERS[number];
const smooth = (n: number) => { const t = Math.max(0, Math.min(1, n)); return t * t * (3 - 2 * t); };
/**
 * 세워진 포털: 타노스 뒤에서 열려 앞으로 지나가며 몸을 드러내고(등장),
 * 끝에 앞에서 다시 열려 뒤로 지나가며 몸을 지운다(퇴장). 포털이 지나간 쪽(뒤)만 보인다.
 */
export function portalState(age: number, extra = 0) {
  const exitAt = snap.duration + extra - 2.4;
  const enter = smooth((age - .5) / (snap.rise - .5)), exit = smooth((age - exitAt - .4) / 1.5);
  const open = Math.min(smooth(age / .5), 1 - smooth((age - snap.rise) / .4)) + Math.min(smooth((age - exitAt) / .4), 1 - smooth((age - snap.duration - extra + .5) / .4));
  return { open, z: BACK + (FRONT - BACK) * (enter - exit) };
}
/**
 * 중지 끝을 엄지에 꾹 눌러 버티다가(press, 힘이 들어가 떨림) 중지를 손바닥으로 탁 내리치고 엄지는 앞으로 밀려난다(flick).
 * 값은 Blender에서 엄지 쪽 옆모습으로 렌더해 맞춘 각도다.
 */
export function fingerPose(age: number): Record<Finger, [number, number]> {
  const t = age - snap.snapAt, curl = smooth((t + 1.7) / .5), press = smooth((t + 1.3) / .6), flick = t < 0 ? 0 : smooth(t / .1), relax = 1 - smooth((t - 2) / .7);
  const shake = t > -.7 && t < 0 ? Math.sin(t * 90) * .025 : 0, overshoot = t > 0 ? Math.sin(Math.min(1, t / .25) * Math.PI) * .12 : 0;
  return {
    Middle: [(-.6 * press + shake - 1.05 * flick - overshoot) * relax, 0],
    Index: [-.3 * press * relax, 0],
    // 약지·새끼는 먼저 손바닥 안으로 말아 쥔다.
    Ring: [-1.75 * curl * relax, 0], Pinky: [-1.8 * curl * relax, 0],
    Thumb: [(.25 * press - .1 * flick) * relax, (.6 * press + .35 * flick) * relax],
  };
}

function Titan({ strike }: { strike: SnapStrike }) {
  const gltf = useGLTF(URL, DRACO), root = useRef<Group>(null), light = useRef<PointLight>(null), spark = useRef<Group>(null), gl = useThree(s => s.gl), camera = useThree(s => s.camera);
  const rig = useMemo(() => {
    // 스키닝된 건틀릿은 SkeletonUtils로 복제해야 본이 새 복제본에 묶인다.
    const model = cloneSkinned(gltf.scene), clip = new Plane();
    model.updateMatrixWorld(true);
    const box = new Box3().setFromObject(model), size = box.getSize(new Vector3()), center = box.getCenter(new Vector3()), scale = HEIGHT / size.y;
    model.traverse(o => {
      const mesh = o as Mesh; if (!mesh.isMesh) return;
      mesh.castShadow = false; mesh.frustumCulled = false;
      mesh.material = (mesh.material as Material).clone(); mesh.material.clippingPlanes = [clip]; mesh.material.clipShadows = true;
    });
    // 손가락 본: 모델 공간 회전(Blender에서 맞춘 각도)을 본 로컬 회전으로 바꾸기 위해 쉬는 자세를 기억한다.
    const bones = FINGERS.map(name => { const bone = model.getObjectByName(name); if (!bone) return null; const world = bone.getWorldQuaternion(new Quaternion()); return { name, bone, rest: bone.quaternion.clone(), world, inverse: world.clone().invert() }; }).filter(b => !!b);
    return { model, scale, clip, bones, offset: new Vector3(-center.x * scale, -box.min.y * scale, -center.z * scale) };
  }, [gltf.scene]);
  useEffect(() => { const before = gl.localClippingEnabled; gl.localClippingEnabled = true; return () => { gl.localClippingEnabled = before; }; }, [gl]);
  useEffect(() => () => rig.model.traverse(o => { const mesh = o as Mesh; if (mesh.isMesh) (mesh.material as Material).dispose(); }), [rig]);
  useFrame(() => {
    const age = (performance.now() - strike.born) / 1000, forward = new Vector3(Math.sin(strike.yaw), 0, Math.cos(strike.yaw));
    root.current?.position.set(strike.point[0], 0, strike.point[2]);
    // 포털 평면보다 뒤쪽(포털이 이미 지나간 쪽)만 남긴다.
    const portal = new Vector3(...strike.point).addScaledVector(forward, portalState(age, strike.extra).z);
    rig.clip.setFromNormalAndCoplanarPoint(forward.clone().negate(), portal);
    const pose = fingerPose(age);
    for (const b of rig.bones) { const [x, z] = pose[b.name]; turn.setFromEuler(angles.set(x, 0, z)); b.bone.quaternion.copy(b.rest).multiply(b.inverse).multiply(turn).multiply(b.world); }
    // 튕긴 손끝에서 작은 금빛 파열이 터진다.
    if (spark.current) { const t = age - snap.snapAt - .04, on = t >= 0 && t < .45; spark.current.visible = on; if (on) { spark.current.scale.setScalar(.04 + t * .9); spark.current.children.forEach(c => { ((c as Mesh).material as MeshBasicMaterial).opacity = 1 - t / .45; }); spark.current.quaternion.copy(camera.quaternion); } }
    // 튕기는 순간 건틀릿이 금빛으로 번쩍인다.
    if (light.current) { const t = age - snap.snapAt; light.current.intensity = t < -.6 ? 0 : t < 0 ? (t + .6) * 8 : 30 * Math.exp(-t * 2.5); }
  });
  return <group ref={root} rotation={[0, strike.yaw, 0]} name="thanos">
    <group position={rig.offset} scale={rig.scale}><primitive object={rig.model} /></group>
    {/* 엄지·중지 끝(모델 기준 손 위치) */}
    <group ref={spark} position={[.5, 2.08, .45]} visible={false} name="snap-spark">
      {[0, 1, 2, 3].map(i => <mesh key={i} rotation={[0, 0, i * Math.PI / 4]}><planeGeometry args={[1, .06]} /><meshBasicMaterial color={i % 2 ? '#fff4c8' : '#ffc94a'} transparent depthWrite={false} toneMapped={false} blending={AdditiveBlending} side={DoubleSide} /></mesh>)}
      <mesh><ringGeometry args={[.42, .5, 32]} /><meshBasicMaterial color="#ffe08a" transparent depthWrite={false} toneMapped={false} blending={AdditiveBlending} side={DoubleSide} /></mesh>
    </group>
    <pointLight ref={light} position={[.5, 2.05, .5]} color="#ffcf6a" intensity={0} distance={9} decay={1.6} />
  </group>;
}
function Portal({ strike }: { strike: SnapStrike }) {
  const group = useRef<Group>(null), swirl = useRef<Group>(null), glow = useRef<PointLight>(null);
  useFrame(() => {
    const age = (performance.now() - strike.born) / 1000, { open, z } = portalState(age, strike.extra);
    if (!group.current) return;
    group.current.visible = open > .01; group.current.position.z = z;
    group.current.scale.set(Math.max(.01, open) * .9, Math.max(.01, open), 1);
    swirl.current?.children.forEach((child, i) => { child.rotation.z = age * (i % 2 ? -1.4 : 2.2); });
    if (glow.current) glow.current.intensity = open * 7;
  });
  return <group position={strike.point} rotation={[0, strike.yaw, 0]}>
    <group ref={group} visible={false} name="thanos-space-portal">
      <group position={[0, 1.42, 0]} scale={1.45}>
        <mesh><circleGeometry args={[1, 64]} /><meshBasicMaterial color="#2f7bff" transparent opacity={.18} side={DoubleSide} depthWrite={false} toneMapped={false} blending={AdditiveBlending} /></mesh>
        <group ref={swirl}>
          <mesh><ringGeometry args={[.9, 1.04, 64]} /><meshBasicMaterial color="#5fb4ff" transparent opacity={.95} side={DoubleSide} depthWrite={false} toneMapped={false} blending={AdditiveBlending} /></mesh>
          <mesh><ringGeometry args={[.78, .84, 7]} /><meshBasicMaterial color="#9fe0ff" transparent opacity={.55} side={DoubleSide} depthWrite={false} toneMapped={false} blending={AdditiveBlending} /></mesh>
          <mesh><ringGeometry args={[.6, .63, 5]} /><meshBasicMaterial color="#3d8bff" transparent opacity={.5} side={DoubleSide} depthWrite={false} toneMapped={false} blending={AdditiveBlending} /></mesh>
        </group>
      </group>
      <pointLight ref={glow} position={[0, 1.4, .3]} color="#4a9dff" intensity={0} distance={7} decay={2} />
    </group>
  </group>;
}
function Sequence({ strike }: { strike: SnapStrike }) {
  const sound = useGame(s => s.sound);
  useEffect(() => { if (!sound) stopSnap(); }, [sound]); useEffect(() => () => stopSnap(), []);
  return <><Portal strike={strike} /><Suspense fallback={null}><Titan strike={strike} /></Suspense></>;
}
export function Thanos() {
  const strike = useGame(s => s.snap), weapon = useGame(s => s.weapon);
  useEffect(() => { if (weapon === 'snap') useGLTF.preload(URL, DRACO); }, [weapon]);
  return <><SnapDust />{strike && <Sequence key={strike.id} strike={strike} />}</>;
}
