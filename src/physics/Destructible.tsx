import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier';
import { Euler, MeshBasicMaterial, Quaternion, Vector3 } from 'three';
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
  const [stage, setStage] = useState(0), stageRef = useRef(0), lastChip = useRef(0);
  const [cracks, setCracks] = useState<Crack[]>([]), [lost, setLost] = useState<number[]>([]), lostRef = useRef<number[]>([]);
  const parts = useMemo(() => model(item), [item]);
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
    stageRef.current = 0;
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
        // 1) 맞은 자리에 금(크랙)이 생기고, 손상이 쌓일수록 길고 많아진다.
        const t = rb.translation(), r = rb.rotation(), inv = new Quaternion(r.x, r.y, r.z, r.w).invert(), scale = item.scale ?? 1;
        const local = new Vector3(...location).sub(new Vector3(t.x, t.y, t.z)).applyQuaternion(inv).divideScalar(scale);
        const surface = surfaceAt(parts, local);
        const ratio = damage.current / spec.threshold;
        if (surface && amount >= 6 && (amount >= 15 || Math.random() < .25)) setCracks(list => [...list.slice(-11), { pos: surface.pos, normal: surface.normal, size: Math.min(surface.maxSize, .12 + ratio * .35 + Math.min(.15, amount / 400)), seed: Math.floor(now) % 997 + list.length * 31 }]);
        // 2) 맞을 때마다 부스러기 가루가 흩날린다.
        if (amount >= 6 && now - lastDust.current > 90) { lastDust.current = now; useGame.getState().addEffect({ id: nextEffectId(), type: 'dust', point: [...location], born: now, radius: Math.min(1, .25 + amount / 120), colors: chipColors }); }
        // 3) 33%·66%를 넘을 때 작은 부품(손잡이·버튼·소품)이 실제로 떨어져 나간다.
        if (nextStage > stageRef.current && nextStage >= 2 && parts.length >= 4) {
          const order = parts.map((p, i) => ({ i, v: p.size[0] * p.size[1] * p.size[2] })).filter(({ i, v }) => v > .00002 && parts[i].collider !== false).sort((a, b) => a.v - b.v);
          const pick = order.filter(({ i }) => !lostRef.current.includes(i)).slice(0, Math.max(1, Math.round(parts.length * .12))).map(({ i }) => i).filter(i => parts[i].size.every(n => n < .6));
          if (pick.length) {
            const q = new Quaternion(r.x, r.y, r.z, r.w), origin = new Vector3(t.x, t.y, t.z);
            useGame.getState().addDebris(pick.map((i, k) => {
              const part = parts[i], wp = new Vector3(...part.pos).multiplyScalar(scale).applyQuaternion(q).add(origin);
              const out = wp.clone().sub(point()).setY(0).normalize();
              return { id: nextEffectId(), part: { ...part, pos: [0, 0, 0], size: part.size.map(n => n * scale) as V3, rotation: undefined, name: `${part.name} (떨어짐)` }, pos: wp.toArray() as V3, rotation: q.toArray() as [number, number, number, number], impulse: [out.x * 1.6, 1.4 + k * .2, out.z * 1.6], mass: .2, born: now + k };
            }));
            lostRef.current = [...lostRef.current, ...pick]; setLost(lostRef.current);
          }
        }
      }
      // 맞을 때마다 맞은 자리에서 작은 조각이 떨어져 나간다 (부서지기 전에도 조각조각).
      const stageUp = nextStage > stageRef.current;
      if (damage.current < spec.threshold && (stageUp || (amount >= 20 && now - lastChip.current > 110))) {
        lastChip.current = now;
        const count = Math.max(stageUp ? 4 : 2, Math.min(7, Math.round(amount / 12)));
        const high = useGame.getState().quality === 'high', palette = chipColors;
        const chips: Debris[] = Array.from({ length: high ? count : Math.ceil(count / 2) }, (_, i) => {
          const r = (n: number) => ((item.id.length * 131 + now * 7 + i * n) % 1000) / 1000;
          const size: V3 = [.06 + r(17) * .12, .03 + r(29) * .06, .06 + r(41) * .11];
          const out = new Vector3(...location).sub(point()).setY(0); if (out.lengthSq() < 1e-4) out.set(r(3) - .5, 0, r(5) - .5); out.normalize();
          const speed = Math.min(maxSpeed + .6, 2.4) * (.6 + r(53) * .7);
          return { id: nextEffectId(), part: { name: `${spec.label} 조각`, pos: [0, 0, 0], size, finish: 'paper', color: palette[i % palette.length], round: .004 }, pos: [location[0] + out.x * .05, Math.max(.06, location[1]), location[2] + out.z * .05], rotation: [r(7) - .5, r(11) - .5, r(13) - .5, 1].map((v, _k, a) => v / Math.hypot(...a)) as [number, number, number, number], impulse: [out.x * speed + (r(19) - .5), 1.2 + r(23) * 1.4, out.z * speed + (r(31) - .5)], mass: .05, born: now + i };
        });
        useGame.getState().addDebris(chips);
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
      const high = useGame.getState().quality === 'high';
      const seed = [...item.id].reduce((sum, ch) => sum * 31 + ch.charCodeAt(0), 7) + useGame.getState().round;
      const major = fractureParts(parts, high ? 44 : 22, Math.abs(seed));
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
      {parts.map((part, index) => lost.includes(index) ? null : <PartMesh key={index} part={part} damaged={stage >= 2} />)}
      {cracks.map((crack, index) => <CrackMark key={index} crack={crack} />)}
    </group>
  </RigidBody>;
});

interface Crack { pos: V3; normal: V3; size: number; seed: number }
/**
 * 맞은 지점에서 가장 가까운 부품 겉면을 찾아, 그 면 위에 금을 눕힌다(허공에 뜨지 않게).
 * 금 크기는 그 면 안에 들어오도록 제한한다.
 */
function surfaceAt(parts: Part[], local: Vector3): { pos: V3; normal: V3; maxSize: number } | null {
  let best: { pos: V3; normal: V3; maxSize: number } | null = null, bestDist = Infinity;
  for (const part of parts) {
    if (part.shape === 'cylinder' || part.collider === false || part.finish === 'glass') continue;
    const rot = part.rotation ? new Quaternion().setFromEuler(new Euler(...part.rotation)) : new Quaternion();
    const p = local.clone().sub(new Vector3(...part.pos)).applyQuaternion(rot.clone().invert()), half = part.size.map(n => n / 2);
    // 박스 바깥이면 박스까지 거리, 안이면 0으로 보고 가장 가까운 면을 고른다.
    const outside = Math.hypot(...[0, 1, 2].map(a => Math.max(0, Math.abs(p.getComponent(a)) - half[a])));
    let axis = 0, gap = Infinity;
    for (let a = 0; a < 3; a++) { const g = Math.abs(half[a] - Math.abs(p.getComponent(a))); if (g < gap) { gap = g; axis = a; } }
    const dist = outside + gap * .01;
    if (dist >= bestDist || outside > .25) continue;
    const sign = p.getComponent(axis) >= 0 ? 1 : -1, onFace = p.clone();
    for (let a = 0; a < 3; a++) onFace.setComponent(a, Math.max(-half[a], Math.min(half[a], onFace.getComponent(a))));
    onFace.setComponent(axis, sign * (half[axis] + .004));
    const normal = new Vector3().setComponent(axis, sign).applyQuaternion(rot);
    const others = [0, 1, 2].filter(a => a !== axis).map(a => part.size[a]);
    bestDist = dist;
    best = { pos: onFace.applyQuaternion(rot).add(new Vector3(...part.pos)).toArray() as V3, normal: normal.toArray() as V3, maxSize: Math.max(.03, Math.min(...others) * .3) };
  }
  return best;
}
const crackMaterial = new MeshBasicMaterial({ color: '#1d1714', transparent: true, opacity: .85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
/** 맞은 자리의 갈라진 금: 중심에서 3~5갈래로 뻗고, 갈래 끝에서 한 번 더 갈라진다. */
function CrackMark({ crack }: { crack: Crack }) {
  const { lines, quaternion } = useMemo(() => {
    let state = crack.seed + 1; const r = () => { state = state * 16807 % 2147483647; return state / 2147483647; };
    const result: { x: number; y: number; angle: number; length: number; width: number }[] = [];
    const branches = 3 + Math.floor(r() * 3);
    for (let b = 0; b < branches; b++) {
      let angle = b / branches * Math.PI * 2 + r() * .8, x = 0, y = 0, length = crack.size * (.35 + r() * .4);
      for (let seg = 0; seg < 3; seg++) {
        const l = length * (.5 + r() * .5), width = .009 * (1 - seg * .25);
        result.push({ x: x + Math.cos(angle) * l / 2, y: y + Math.sin(angle) * l / 2, angle, length: l, width });
        x += Math.cos(angle) * l; y += Math.sin(angle) * l;
        if (seg === 1 && r() < .6) { const side = angle + (r() < .5 ? .7 : -.7), sl = l * .6; result.push({ x: x + Math.cos(side) * sl / 2, y: y + Math.sin(side) * sl / 2, angle: side, length: sl, width: width * .7 }); }
        angle += (r() - .5) * .9; length *= .8;
      }
    }
    return { lines: result, quaternion: new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(...crack.normal)) };
  }, [crack]);
  return <group position={crack.pos} quaternion={quaternion}>
    {lines.map((line, i) => <mesh key={i} position={[line.x, line.y, 0]} rotation={[0, 0, line.angle]} material={crackMaterial}><planeGeometry args={[line.length, line.width]} /></mesh>)}
  </group>;
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
