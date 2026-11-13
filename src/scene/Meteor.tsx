import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, Color, EdgesGeometry, Group, IcosahedronGeometry, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { meteorPosition, meteorProgress, type MeteorStrike } from '../data/meteor';
import { useGame } from '../game/store';
import { stopMeteorFall } from '../game/audio';
import config from '../weapons/meteor';

function MeteorVisual({ strike }: { strike: MeteorStrike }) {
  const { scene, gl } = useThree();
  const rock = useRef<Group>(null), trail = useRef<Group>(null), marker = useRef<Group>(null), dust = useRef<Group>(null), chunks = useRef<Group>(null), wave = useRef<Mesh>(null);
  const quality = useGame(s => s.quality), sound = useGame(s => s.sound);
  const count = quality === 'low' ? 12 : quality === 'medium' ? 20 : 28;
  const atmosphere=useMemo(()=>({ background:scene.background instanceof Color?scene.background.clone():null, fog:scene.fog?.color.clone(), exposure:gl.toneMappingExposure }),[scene,gl]);
  useEffect(()=>()=>{if(atmosphere.background && scene.background instanceof Color)scene.background.copy(atmosphere.background);if(atmosphere.fog && scene.fog)scene.fog.color.copy(atmosphere.fog);gl.toneMappingExposure=atmosphere.exposure;},[atmosphere,scene,gl]);
  const geometry = useMemo(() => {
    const g = new IcosahedronGeometry(.98, 2), p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) { const n = 1 + Math.sin(p.getX(i) * 17 + p.getY(i) * 9 + p.getZ(i) * 23) * .13; p.setXYZ(i, p.getX(i)*n, p.getY(i)*n, p.getZ(i)*n); }
    g.computeVertexNormals(); return g;
  }, []);
  const edges = useMemo(() => new EdgesGeometry(geometry, 18), [geometry]);
  useEffect(() => () => { geometry.dispose(); edges.dispose(); stopMeteorFall(); }, [geometry, edges]);
  useEffect(() => { if (!sound) stopMeteorFall(); }, [sound]);
  useFrame(() => {
    const now = performance.now(), t = meteorProgress(strike, now), age = (now - strike.born) / 1000;
    const impact = age - config.flight, fade = Math.max(0, 1 - impact / config.aftermath);
    const darkness=impact<0?1:Math.max(0,1-impact/config.aftermath);
    if(atmosphere.background && scene.background instanceof Color)scene.background.copy(atmosphere.background).lerp(new Color('#101823'),darkness*.85);
    if(atmosphere.fog && scene.fog)scene.fog.color.copy(atmosphere.fog).lerp(new Color('#131d29'),darkness*.8);
    gl.toneMappingExposure=atmosphere.exposure*(1-darkness*.55);
    if (rock.current) {
      rock.current.visible = impact < 0;
      rock.current.position.set(...meteorPosition(strike.point, t));
      rock.current.quaternion.setFromUnitVectors(new Vector3(0,1,0), new Vector3(5,-18,3).normalize());
      rock.current.rotateY(age * 1.2);
    }
    if (trail.current) trail.current.children.forEach((object, i) => {
      const lag = (i + 1) * .025, p = Math.max(0, t - lag);
      object.visible = impact < .15 && t > lag;
      object.position.set(...meteorPosition(strike.point, p));
      object.scale.setScalar(.19 + i / count * .4);
      object.rotation.y = age + i;
      ((object as Mesh).material as MeshBasicMaterial).opacity = (1 - i / count) * .42;
    });
    if (marker.current) {
      marker.current.visible = impact < 0;
      marker.current.rotation.y = -age * .8;
      marker.current.scale.setScalar(1 + Math.sin(age * 9) * .055);
    }
    if (dust.current) {
      dust.current.visible = impact >= 0 && fade > 0;
      dust.current.children.forEach((object, i) => {
        const a = i * 2.39996, r = Math.max(0, impact) * (1.2 + i % 4) * .9;
        object.position.set(Math.cos(a)*r, .15 + Math.max(0,impact)*(.6+i%3*.5), Math.sin(a)*r);
        object.scale.setScalar(.2 + Math.max(0,impact)*(.5+i%3*.15));
        ((object as Mesh).material as MeshBasicMaterial).opacity = Math.max(0, fade) * .42;
      });
    }
    if (wave.current) {
      if(chunks.current) {
        chunks.current.visible=impact>=0 && fade>0;
        chunks.current.children.forEach((object,i)=>{const a=i*2.39996, v=2+i%5;object.position.set(Math.cos(a)*impact*v,Math.max(.04,impact*(2+i%3)-4.9*impact*impact),Math.sin(a)*impact*v);object.rotation.set(impact*(i+1),impact*4,impact*2);object.scale.setScalar(Math.max(.01,fade));});
      }
      wave.current.visible = impact >= 0 && fade > 0;
      wave.current.scale.setScalar(Math.max(.01, impact * config.radius * 1.8));
      (wave.current.material as MeshBasicMaterial).opacity = fade * .8;
    }
  });
  return <group name="meteor-cinematic-effect">
    <group ref={rock}>
      <mesh geometry={geometry} castShadow><meshStandardMaterial color="#3a2c26" roughness={.9} emissive="#9b2d0e" emissiveIntensity={.95} flatShading /></mesh>
      <lineSegments geometry={edges}><lineBasicMaterial color="#ff762c" toneMapped={false} /></lineSegments>
      <mesh scale={1.2}><sphereGeometry args={[.98,16,12]} /><meshBasicMaterial color="#ff5c19" toneMapped={false} transparent opacity={.22} depthWrite={false} blending={AdditiveBlending} /></mesh>
      <mesh position={[0,-2.3,0]} rotation={[0,0,Math.PI]}><coneGeometry args={[.92,5.0,16]} /><meshBasicMaterial color="#f65f18" toneMapped={false} transparent opacity={.55} depthWrite={false} blending={AdditiveBlending} /></mesh>
      <mesh position={[0,-1.3,0]} rotation={[0,0,Math.PI]}><coneGeometry args={[.52,3,12]} /><meshBasicMaterial color="#ffc270" toneMapped={false} transparent opacity={.8} depthWrite={false} blending={AdditiveBlending} /></mesh>
    </group>
    <group ref={trail}>{Array.from({length:count},(_,i)=><mesh key={i}><icosahedronGeometry args={[1,1]} /><meshBasicMaterial color={i<3?'#f5a263':'#7c7872'} transparent opacity={.3} depthWrite={false} /></mesh>)}</group>
    <group ref={marker} position={[strike.point[0],strike.point[1]+.025,strike.point[2]]}>
      <mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[1.14,1.18,48]} /><meshBasicMaterial color="#ffb36b" transparent opacity={.9} depthTest={false} side={2} /></mesh>
      {[0,1,2,3].map(i=><mesh key={i} rotation={[-Math.PI/2,0,i*Math.PI/2]}><ringGeometry args={[.79,.85,12,1,.12,.7]} /><meshBasicMaterial color="#ff8647" depthTest={false} side={2} /></mesh>)}
      <mesh rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.065,12]} /><meshBasicMaterial color="#ffe1af" depthTest={false} side={2} /></mesh>
    </group>
    <group ref={dust} position={strike.point} visible={false}>{Array.from({length:count},(_,i)=><mesh key={i}><icosahedronGeometry args={[1,1]} /><meshBasicMaterial color={i%3?'#827d74':'#b3a48e'} transparent opacity={0} depthWrite={false} /></mesh>)}</group>
    <group ref={chunks} position={strike.point} visible={false}>{Array.from({length:quality==='low'?10:18},(_,i)=><mesh key={i}><icosahedronGeometry args={[.08+(i%3)*.035,0]} /><meshStandardMaterial color={i%3?'#453c33':'#ba5f26'} roughness={1} flatShading /></mesh>)}</group>
    <mesh ref={wave} position={[strike.point[0],strike.point[1]+.04,strike.point[2]]} rotation={[-Math.PI/2,0,0]} visible={false}><ringGeometry args={[.94,1,64]} /><meshBasicMaterial color="#ffcd8e" transparent opacity={0} depthWrite={false} side={2} /></mesh>
  </group>;
}
export function Meteor() { const strike=useGame(s=>s.meteor); return strike ? <MeteorVisual key={strike.id} strike={strike} /> : null; }
