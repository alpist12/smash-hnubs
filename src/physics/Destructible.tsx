import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier';
import { Euler, Quaternion, Vector3 } from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { Item, V3, Debris } from '../data/types';
import { specs } from '../data/room';
import { fractureParts } from './fracture';
import { model } from '../scene/models';
import { PartMesh } from '../scene/PartMesh';
import { useGame } from '../game/store';
import { aim, attack, targets, nextEffectId } from './attacks';

export const Destructible = memo(function Destructible({ item }: { item: Item }) {
  const body = useRef<RapierRigidBody>(null), damage = useRef(0), broken = useRef(false), lastContact = useRef(0);
  const [stage, setStage] = useState(0);
  const parts = useMemo(() => model(item), [item]);
  const spec = specs[item.kind], spawned = useRef(performance.now());
  const round = useGame(s => s.round), ceiling = useGame(s => s.ceiling), walls = useGame(s => s.walls);

  useEffect(() => {
    const rb = body.current;
    if (!rb) return;
    if (!item.fixed) rb.sleep();
    const centerY = (Math.min(...parts.map(p => p.pos[1] - p.size[1] / 2)) + Math.max(...parts.map(p => p.pos[1] + p.size[1] / 2))) / 2;
    const point = () => { const t = rb.translation(), r = rb.rotation(); return new Vector3(0, centerY * (item.scale ?? 1), 0).applyQuaternion(new Quaternion(r.x, r.y, r.z, r.w)).add(t); };
    const hit = (amount: number, impulse: V3, location: V3) => {
      if (broken.current || amount < .1) return;
      if (item.kind === 'light' && !useGame.getState().ceiling) return;
      if (item.kind === 'panel' && !useGame.getState().walls) return;
      damage.current += amount;
      setStage(Math.min(3, Math.ceil(damage.current / spec.threshold * 3)));
      if (!item.fixed) {
        rb.wakeUp();
        const gain = Math.sqrt(spec.mass) * .45;
        rb.applyImpulse({ x: impulse[0] * gain, y: impulse[1] * gain, z: impulse[2] * gain }, true);
        rb.applyTorqueImpulse({ x: impulse[2] * .12, y: impulse[0] * .1, z: -impulse[0] * .15 }, true);
      }
      if (damage.current < spec.threshold) return;
      broken.current = true;
      targets.delete(item.id);
      if (aim.target === item.id) { aim.target = ''; useGame.setState({ hovered: '' }); }
      if (!useGame.getState().destroy(item.id, spec.score)) return;
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
        const kick = direction.multiplyScalar(Math.min(5, 1.2 + amount / 60) * (.75 + (index * 37 % 10) / 20));
        return { id: nextEffectId(), part: { ...part, pos: [0, 0, 0], size: part.size.map(n => n * scale) as V3, rotation: undefined }, pos: p.toArray() as V3, rotation: rotQ.toArray(), impulse: [kick.x + Math.max(-1.5, Math.min(1.5, impulse[0] * .06)), kick.y + .4, kick.z + Math.max(-1.5, Math.min(1.5, impulse[2] * .06))], mass: Math.max(.1, spec.mass / major.length), born: performance.now() + index };
      });
      useGame.getState().addDebris(debris);
      setStage(4);
    };
    targets.set(item.id, { point, hit });
    return () => { targets.delete(item.id); };
  }, [item, parts, round, spec]);

  function onAim(e: ThreeEvent<PointerEvent>) {
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
        targets.get(item.id)?.hit(Math.min(60, (impact - spec.collision) * .45), [0, .1, 0], targets.get(item.id)!.point().toArray() as V3);
      }
    }}>
    {parts.filter(p => p.collider !== false).map((part, index) => <CuboidCollider key={index} args={part.size.map(n => Math.max(.008, n / 2)) as V3} position={part.pos} rotation={part.rotation} mass={spec.mass / parts.length} />)}
    <group visible={(item.kind !== 'light' || ceiling) && (item.kind !== 'panel' || walls)} name={`model:${item.id}`} onPointerMove={onAim} onPointerOver={onAim} onPointerOut={() => { aim.target = ''; useGame.setState({ hovered: '' }); }}
      onPointerDown={e => { onAim(e); if (useGame.getState().weapon === 'laser' && e.button === 0) { aim.holding = true; attack(aim.point, item.id); } }}
      onClick={e => { e.stopPropagation(); if (e.delta <= 5 && e.button === 0 && useGame.getState().weapon !== 'laser') attack(e.point.toArray() as V3, item.id); }}>
      {parts.map((part, index) => <PartMesh key={index} part={part} damaged={stage >= 2} />)}
      {stage >= 2 && <mesh position={[0, item.kind === 'sofa' ? .8 : .4, .04]} rotation={[0, 0, -.5]}><boxGeometry args={[.012, .2, .018]} /><meshBasicMaterial color="#251d17" /></mesh>}
    </group>
  </RigidBody>;
});

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
    <CuboidCollider args={fragment.part.size.map(v => Math.max(.015, v / 2)) as V3} mass={fragment.mass} collisionGroups={0x00020001} />
    <PartMesh part={fragment.part} damaged />
  </RigidBody>;
}
