import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier';
import { Euler, Quaternion, Vector3 } from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { Item, Part, V3, Debris } from '../data/types';
import { ITEMS, specs } from '../data/room';
import { fractureParts } from './fracture';
import { model } from '../scene/models';
import { PartMesh } from '../scene/PartMesh';
import { useGame } from '../game/store';
import { useFrame } from '@react-three/fiber';
import { wallVisible } from '../scene/wallVisibility';
import { aim, attack, targets, nextEffectId } from './attacks';

// 충돌 그룹 (상위 16비트: 소속, 하위 16비트: 부딪히는 대상).
// 가구=그룹1(전부와 충돌), 파편=그룹2(고정 바닥·벽(그룹4 포함)만 충돌) → 파편이 가구를 밀어 터뜨리지 않는다.
const FURNITURE_GROUPS = 0x0001ffff, DEBRIS_GROUPS = 0x00020004;
export const Destructible = memo(function Destructible({ item }: { item: Item }) {
  const body = useRef<RapierRigidBody>(null), damage = useRef(0), broken = useRef(false), lastContact = useRef(0);
  const lastDust = useRef(0);
  const [stage, setStage] = useState(0), stageRef = useRef(0);
  const [removed, setRemoved] = useState<number[]>([]), removedRef = useRef<number[]>([]);
  const parts = useMemo(() => model(item), [item]);
  // 미리 조각으로 나눠 둔 모양(맞을 때부터 이 조각들로 그린다).
  const pieces = useMemo(() => fractureParts(parts, useGame.getState().quality === 'high' ? 36 : 20, Math.abs([...item.id].reduce((sum, ch) => sum * 31 + ch.charCodeAt(0), 7))), [parts, item.id]);
  // 조각 색: 유리·화면을 뺀 가장 큰 부품들의 색.
  const chipColors = useMemo(() => {
    const colors = [...new Set(parts.filter(p => p.finish !== 'glass' && p.finish !== 'screen').sort((a, b) => b.size[0] * b.size[1] * b.size[2] - a.size[0] * a.size[1] * a.size[2]).slice(0, 4).map(p => p.color ?? '#9a9a90'))];
    return colors.length ? colors : ['#9a9a90'];
  }, [parts]);
  const spec = specs[item.kind], spawned = useRef(performance.now());
  const round = useGame(s => s.round), ceiling = useGame(s => s.ceiling);
  const view = useRef<import('three').Group>(null), shown = useRef(true);
  // 벽·문·벽 부착물은 카메라 위치에 따라 잘라 보이고(컷어웨이), 숨겨진 동안에는 클릭이 뒤로 통과한다.
  useFrame(({ camera }) => {
    if (!item.wall || !view.current) return;
    shown.current = wallVisible(item.wall, camera.position.x, camera.position.z);
    view.current.visible = shown.current;
  });

  useEffect(() => {
    const rb = body.current;
    if (!rb) return;
    if (!item.fixed) rb.sleep();
    stageRef.current = 0; removedRef.current = [];
    const centerY = (Math.min(...parts.map(p => p.pos[1] - p.size[1] / 2)) + Math.max(...parts.map(p => p.pos[1] + p.size[1] / 2))) / 2;
    const point = () => { const t = rb.translation(), r = rb.rotation(); return new Vector3(0, centerY * (item.scale ?? 1), 0).applyQuaternion(new Quaternion(r.x, r.y, r.z, r.w)).add(t); };
    const hit = (amount: number, impulse: V3, location: V3, maxSpeed = 3, fromContact = false) => {
      if (broken.current || amount < .1) return;
      // 가구끼리 부딪힌 충격만으로는 부서지지 않는다(금만 간다). 실제 무기로 맞아야 깨진다.
      if (fromContact) amount = Math.min(amount, Math.max(0, spec.threshold * .9 - damage.current));
      if (amount < .1) return;
      if (item.kind === 'light' && !useGame.getState().ceiling) return;
      damage.current += amount;
      const nextStage = Math.min(3, Math.ceil(damage.current / spec.threshold * 3));
      const now = performance.now();
      if (damage.current < spec.threshold) {
        // 1) 맞을 때마다 맞은 자리 근처 조각이 실제로 떨어져 나간다. 손상이 쌓일수록 점점 부서지고, 100%가 되면 남은 조각이 와르르 무너진다.
        const t = rb.translation(), r = rb.rotation(), q = new Quaternion(r.x, r.y, r.z, r.w), scale = item.scale ?? 1, origin = new Vector3(t.x, t.y, t.z);
        const local = new Vector3(...location).sub(origin).applyQuaternion(q.clone().invert()).divideScalar(scale);
        const ratio = damage.current / spec.threshold, cap = Math.floor(pieces.length * .7);
        let need = Math.min(cap, Math.floor(ratio * cap)) - removedRef.current.length;
        if (need <= 0 && amount >= 15 && removedRef.current.length < cap) need = 1;
        if (need > 0 && pieces.length > 1) {
          const pick = pieces.map((piece, i) => ({ i, d: new Vector3(...piece.pos).distanceToSquared(local) })).filter(({ i }) => !removedRef.current.includes(i)).sort((x, y) => x.d - y.d).slice(0, need).map(({ i }) => i);
          useGame.getState().addDebris(pick.map((i, k) => pieceDebris(pieces[i], q, origin, scale, location, Math.min(maxSpeed + .8, 3), now + k)));
          removedRef.current = [...removedRef.current, ...pick]; setRemoved(removedRef.current);
        }
        // 2) 맞을 때마다 부스러기 가루가 흩날린다.
        if (amount >= 6 && now - lastDust.current > 90) { lastDust.current = now; useGame.getState().addEffect({ id: nextEffectId(), type: 'dust', point: [...location], born: now, radius: Math.min(1, .25 + amount / 120), colors: chipColors }); }
      }
      stageRef.current = nextStage;
      setStage(nextStage);
      if (!item.fixed) {
        rb.wakeUp();
        // 가벼운 물건이 총알처럼 튀지 않도록 속도 변화(Δv)를 무기별 상한으로 자른다.
        const gain = Math.sqrt(spec.mass) * .45, length = Math.hypot(...impulse) || 1;
        const dv = Math.min(length * gain / spec.mass, maxSpeed), scale = dv * spec.mass / length;
        rb.applyImpulse({ x: impulse[0] * scale, y: impulse[1] * scale, z: impulse[2] * scale }, true);
        const spin = Math.min(1, maxSpeed / 4) * spec.mass * .04;
        rb.applyTorqueImpulse({ x: impulse[2] / length * spin, y: impulse[0] / length * spin * .6, z: -impulse[0] / length * spin }, true);
      }
      if (damage.current < spec.threshold) return;
      broken.current = true;
      targets.delete(item.id);
      if (aim.target === item.id) { aim.target = ''; useGame.setState({ hovered: '' }); }
      if (!useGame.getState().destroy(item.id, spec.score)) return;
      // 벽이 무너지면 거기 걸려 있던 화이트보드·시계 등도 함께 떨어져 부서진다.
      ITEMS.filter(child => child.parentId === item.id && child.fixed).forEach((child, i) => setTimeout(() => targets.get(child.id)?.hit(1e6, [0, .4, 0], child.pos as V3), 60 + i * 50));
      const origin = rb.translation(), rot = rb.rotation(), q = new Quaternion(rot.x, rot.y, rot.z, rot.w);
      const major = pieces.filter((_, i) => !removedRef.current.includes(i));
      // 물리 없이 튀는 작은 조각(칩)으로 '와장창' 느낌을 더한다.
      const colors = [...new Set(parts.filter(p => p.finish !== 'glass' && p.finish !== 'screen').sort((a, b) => b.size[0] * b.size[1] * b.size[2] - a.size[0] * a.size[1] * a.size[2]).slice(0, 4).map(p => p.color ?? '#9a9a90'))];
      const extent = Math.max(...parts.map(p => Math.max(Math.abs(p.pos[0]) + p.size[0] / 2, Math.abs(p.pos[2]) + p.size[2] / 2))) * (item.scale ?? 1);
      useGame.getState().addEffect({ id: nextEffectId(), type: 'shatter', point: point().toArray() as V3, born: performance.now(), radius: Math.min(1.6, Math.max(.35, extent)), colors: colors.length ? colors : ['#9a9a90'] });
      const debris: Debris[] = major.map((part, index) => {
        const scale = item.scale ?? 1;
        const p = new Vector3(...part.pos).multiplyScalar(scale).applyQuaternion(q).add(origin);
        const local = new Quaternion();
        if (part.rotation) local.setFromEuler(new Euler(...part.rotation));
        const rotQ = q.clone().multiply(local);
        const direction = p.clone().sub(new Vector3(...location)); direction.y += .6; direction.normalize();
        const kick = direction.multiplyScalar(Math.min(5, maxSpeed + .8, 1.2 + amount / 60) * (.75 + (index * 37 % 10) / 20));
        return { id: nextEffectId(), part: { ...part, pos: [0, 0, 0], size: part.size.map(n => n * scale) as V3, rotation: undefined }, pos: p.toArray() as V3, rotation: rotQ.toArray(), impulse: [kick.x + Math.max(-1.5, Math.min(1.5, impulse[0] * .06)), kick.y + .4, kick.z + Math.max(-1.5, Math.min(1.5, impulse[2] * .06))], mass: Math.max(.1, spec.mass / major.length), born: performance.now() + index };
      });
      useGame.getState().addDebris(debris);
      setStage(4);
    };
    targets.set(item.id, { point, hit });
    return () => { targets.delete(item.id); };
  }, [item, parts, round, spec]);

  function onAim(e: ThreeEvent<PointerEvent>) {
    if (!shown.current) return;
    e.stopPropagation(); aim.point = e.point.toArray() as V3; aim.target = item.id;
    // 조준 원이 맞은 면(벽이면 세로면)에 붙도록 면의 방향을 기억한다.
    if (e.face) aim.normal = e.face.normal.clone().transformDirection(e.object.matrixWorld).toArray() as V3;
    useGame.setState({ hovered: `${spec.label}${stage > 0 ? ` · 손상 ${Math.min(99, Math.round(damage.current / spec.threshold * 100))}%` : ''}` });
  }
  if (stage === 4) return null;
  return <RigidBody ref={body} name={item.id} position={item.pos} rotation={[0, item.rotation ?? 0, 0]} scale={item.scale ?? 1} type={item.fixed ? 'fixed' : 'dynamic'} colliders={false} canSleep linearDamping={.5} angularDamping={.7} friction={.65} restitution={.12}
    onContactForce={event => {
      const now = performance.now();
      if (now - spawned.current < 1800 || now - lastContact.current < 300 || broken.current || item.fixed) return;
      const impact = event.totalForceMagnitude / 60;
      if (impact > spec.collision) {
        lastContact.current = now;
        targets.get(item.id)?.hit(Math.min(30, (impact - spec.collision) * .3), [0, .1, 0], targets.get(item.id)!.point().toArray() as V3, 1, true);
      }
    }}>
    {parts.filter(p => p.collider !== false).map((part, index) => <CuboidCollider key={index} args={part.size.map(n => Math.max(.008, n / 2)) as V3} position={part.pos} rotation={part.rotation} mass={spec.mass / parts.length} collisionGroups={FURNITURE_GROUPS} />)}
    <group ref={view} visible={item.kind !== 'light' || ceiling} name={`model:${item.id}`} onPointerMove={onAim} onPointerOver={onAim} onPointerOut={() => { if (aim.target === item.id) { aim.target = ''; useGame.setState({ hovered: '' }); } }}
      onPointerDown={e => { if (!shown.current) return; onAim(e); if (useGame.getState().weapon === 'laser' && e.button === 0) { aim.holding = true; attack(aim.point, item.id); } }}
      onClick={e => { if (!shown.current) return; e.stopPropagation(); if (e.delta <= 5 && e.button === 0 && useGame.getState().weapon !== 'laser') attack(e.point.toArray() as V3, item.id); }}>
      {removed.length ? pieces.map((piece, index) => removed.includes(index) ? null : <PartMesh key={`p${index}`} part={piece} damaged={stage >= 2} />) : parts.map((part, index) => <PartMesh key={index} part={part} damaged={stage >= 2} />)}
    </group>
  </RigidBody>;
});

/** 떨어져 나가는 조각 하나를 물리 파편으로 만든다(맞은 쪽 반대로 살짝 튀며 떨어진다). */
function pieceDebris(part: Part, q: Quaternion, origin: Vector3, scale: number, from: V3, speed: number, born: number): Debris {
  const p = new Vector3(...part.pos).multiplyScalar(scale).applyQuaternion(q).add(origin), local = new Quaternion();
  if (part.rotation) local.setFromEuler(new Euler(...part.rotation));
  const dir = p.clone().sub(new Vector3(...from)); dir.y = Math.max(.15, dir.y) + .45; dir.normalize();
  const kick = dir.multiplyScalar(speed * (.65 + (Math.floor(born * 7) % 10) / 20));
  return { id: nextEffectId(), part: { ...part, pos: [0, 0, 0], size: part.size.map(n => n * scale) as V3, rotation: undefined }, pos: p.toArray() as V3, rotation: q.clone().multiply(local).toArray() as [number, number, number, number], impulse: [kick.x, kick.y + .3, kick.z], mass: .2, born };
}
export function Fragment({ fragment }: { fragment: Debris }) {
  const ref = useRef<RapierRigidBody>(null);
  useEffect(() => {
    const body = ref.current; if (!body) return;
    body.setRotation({ x: fragment.rotation[0], y: fragment.rotation[1], z: fragment.rotation[2], w: fragment.rotation[3] }, true);
    body.applyImpulse({ x: fragment.impulse[0] * fragment.mass, y: fragment.impulse[1] * fragment.mass, z: fragment.impulse[2] * fragment.mass }, true);
    const spin = (fragment.id % 7) - 3;
    body.setAngvel({ x: fragment.impulse[2] + spin, y: .8 + spin * .6, z: fragment.impulse[0] - spin * .5 }, true);
  }, [fragment]);
  return <RigidBody ref={ref} position={fragment.pos} colliders={false} canSleep ccd linearDamping={.35} angularDamping={.5} restitution={.2} friction={.65}>
    <CuboidCollider args={fragment.part.size.map(v => Math.max(.015, v / 2)) as V3} mass={fragment.mass} collisionGroups={DEBRIS_GROUPS} />
    <PartMesh part={fragment.part} damaged />
  </RigidBody>;
}
