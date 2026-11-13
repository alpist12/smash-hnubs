import { Component, Suspense, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Box3, Group, Quaternion, Vector3, type Mesh, type Object3D } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { CharacterProfile } from '../data/characters';
import { CharacterGait } from './characterGait';

type Motion = RefObject<{ speed: number }>;
const ARM_DROP = .9; // A포즈 팔을 몸 옆으로 내리는 정도(1 = 완전히 아래). 팔이 몸을 뚫으면 낮춘다.
const X = new Vector3(1, 0, 0);

class ModelBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.warn('캐릭터 GLB를 불러오지 못했습니다.', error); }
  render() { return this.state.failed ? null : this.props.children; }
}

// 뼈를 모델 기준(쉬는 자세) 축으로 돌린다. 부모 뼈가 같은 축으로만 돌기 때문에 쉬는 자세의 부모 방향으로 충분하다.
function bone(model: Object3D, name: string) {
  const b = model.getObjectByName(name);
  if (!b?.parent) return null;
  const parent = b.parent.getWorldQuaternion(new Quaternion()), inverse = parent.clone().invert(), rest = b.quaternion.clone();
  return {
    b, world: b.getWorldPosition(new Vector3()),
    set(q: Quaternion) { b.quaternion.copy(inverse).multiply(q).multiply(parent).multiply(rest); },
  };
}

function GltfCharacter({ url, height, motion }: { url: string; height: number; motion?: Motion }) {
  const { scene } = useGLTF(url);
  const root = useRef<Group>(null), gait = useRef(new CharacterGait());
  // 원본 크기·원점이 제각각이라 키 height, 발 y=0, 가로 중심 원점으로 맞춘다. 정면은 +Z 기준.
  const { model, scale, offset, rig } = useMemo(() => {
    const model = clone(scene);
    model.traverse(o => { if ((o as Mesh).isMesh) o.castShadow = o.receiveShadow = true; });
    model.updateMatrixWorld(true);
    const box = new Box3().setFromObject(model), center = box.getCenter(new Vector3());
    const scale = height / Math.max(1e-6, box.max.y - box.min.y);
    // 다리는 [오른쪽(-X), 왼쪽(+X)] 순서로 CharacterGait.leg(0/1)과 맞춘다.
    const legs = (['Right', 'Left'] as const).map(s => ({ hip: bone(model, `${s}UpLeg`), knee: bone(model, `${s}Leg`), ankle: bone(model, `${s}Foot`) }));
    const arms = (['Right', 'Left'] as const).map(s => {
      const arm = bone(model, `${s}Arm`), fore = bone(model, `${s}ForeArm`);
      const down = arm && fore ? new Quaternion().slerpQuaternions(new Quaternion(), new Quaternion().setFromUnitVectors(fore.world.clone().sub(arm.world).normalize(), new Vector3(0, -1, 0)), ARM_DROP) : new Quaternion();
      return { arm, down };
    });
    return { model, scale, offset: [-center.x * scale, -box.min.y * scale, -center.z * scale] as const, rig: { legs, arms } };
  }, [scene, height]);
  const q = useMemo(() => new Quaternion(), []);
  useFrame((_, delta) => {
    const pose = gait.current; pose.step(motion?.current.speed ?? 0, delta);
    rig.legs.forEach((leg, i) => {
      const a = pose.leg(i);
      leg.hip?.set(q.setFromAxisAngle(X, a.hip)); leg.knee?.set(q.setFromAxisAngle(X, a.knee)); leg.ankle?.set(q.setFromAxisAngle(X, a.ankle));
    });
    rig.arms.forEach(({ arm, down }, i) => arm?.set(q.setFromAxisAngle(X, Math.sin(pose.phase + i * Math.PI) * .2 * pose.blend).multiply(down)));
    if (root.current) root.current.position.y = offset[1] + pose.bob;
  });
  return <group ref={root} position={offset} scale={scale}><primitive object={model} /></group>;
}

export function CharacterView({ profile, motion }: { profile: CharacterProfile; motion?: Motion }) {
  return <ModelBoundary>
    <Suspense fallback={null}><GltfCharacter url={`${import.meta.env.BASE_URL}${profile.model}`} height={profile.height} motion={motion} /></Suspense>
  </ModelBoundary>;
}
