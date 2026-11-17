import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {AdditiveBlending,Group,InstancedMesh,Mesh,MeshBasicMaterial,MeshStandardMaterial,Object3D,Points,PointsMaterial,PointLight,Quaternion,Vector3,LineBasicMaterial} from 'three';
import {useGame} from '../game/store';
import {ascentBurstParticle,rayquazaFrame,type RayquazaStrike} from '../data/rayquaza';
import {BOOTH_WALL_Z,PLATFORM_EDGE_X,STUDIO_START} from '../data/studios';
import config from '../weapons/ascent';
const UP=new Vector3(0,1,0);
export function DragonAscentVfx({strike}:{strike:RayquazaStrike}){
 const quality=useGame(s=>s.quality),rockCount=quality==='low'?24:quality==='medium'?44:64,sparkCount=quality==='low'?60:quality==='medium'?100:160,dustCount=quality==='low'?12:20;
 const flight=useRef<Group>(null),waves=useRef<Group>(null),rocks=useRef<InstancedMesh>(null),dust=useRef<InstancedMesh>(null),sparks=useRef<Points>(null),column=useRef<Mesh>(null),light=useRef<PointLight>(null),cracks=useRef<LineBasicMaterial>(null);
 const dummy=useMemo(()=>new Object3D(),[]),orientation=useMemo(()=>new Quaternion(),[]),sparkPositions=useMemo(()=>new Float32Array(sparkCount*3),[sparkCount]);
 const groundY=strike.point[2]<STUDIO_START&&strike.point[2]>BOOTH_WALL_Z&&strike.point[0]>PLATFORM_EDGE_X?.145:.025;
 const crackPositions=useMemo(()=>{
  const points:number[]=[];for(let i=0;i<16;i++){const a=i*2.399963,r=2.2+i%4*.5;const p=[Math.cos(a)*r*.35,0,Math.sin(a)*r*.35],q=[Math.cos(a+.13)*r,0,Math.sin(a+.13)*r];points.push(0,0,0,...p,...p,...q);}
  return new Float32Array(points);
 },[]);
 useFrame(()=>{
  const age=(performance.now()-strike.born)/1000,t=age-config.impact,frame=rayquazaFrame(age,'ascent',strike.point),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(flight.current){
   flight.current.visible=age>=9.9&&t<0;flight.current.position.set(...frame.position);
   const direction=new Vector3(...frame.next).sub(new Vector3(...frame.position));if(direction.lengthSq()>.00001)flight.current.quaternion.copy(orientation.setFromUnitVectors(UP,direction.normalize()));
   flight.current.children.forEach((child,i)=>{if(i>1){child.rotation.y=age*3+i;child.scale.setScalar(1+Math.sin(age*9+i)*.12);}});
  }
  if(waves.current){waves.current.visible=t>=0&&t<2;waves.current.children.forEach((child,i)=>{const mesh=child as Mesh,elapsed=Math.max(0,t-i*.07);mesh.scale.setScalar(.01+Math.sqrt(elapsed)*11);(mesh.material as MeshBasicMaterial).opacity=Math.max(0,1-elapsed/1.6)*(.8-i*.12);});}
  const visible=t>=0&&t<3;
  if(rocks.current){rocks.current.visible=visible;if(visible){for(let i=0;i<rockCount;i++){const particle=ascentBurstParticle(i,t);dummy.position.set(...particle.position);dummy.scale.setScalar(particle.size);dummy.rotation.set(t*(i%4+2),t*3,i+t);dummy.updateMatrix();rocks.current.setMatrixAt(i,dummy.matrix);}rocks.current.instanceMatrix.needsUpdate=true;(rocks.current.material as MeshStandardMaterial).opacity=ascentBurstParticle(0,t).fade;}}
  if(sparks.current){sparks.current.visible=visible;if(visible){const positions=sparks.current.geometry.getAttribute('position');for(let i=0;i<sparkCount;i++){const p=ascentBurstParticle(i+31,t);positions.setXYZ(i,p.position[0]*.8,p.position[1]*1.3+.1,p.position[2]*.8);}positions.needsUpdate=true;(sparks.current.material as PointsMaterial).opacity=ascentBurstParticle(0,t).fade*.9;}}
  if(dust.current){dust.current.visible=visible;if(visible){for(let i=0;i<dustCount;i++){const a=i*2.399963,r=Math.max(0,t)*(1+i%4)*1.1;dummy.position.set(Math.cos(a)*r,.1+Math.sqrt(t)*(.5+i%3*.3),Math.sin(a)*r);dummy.scale.setScalar(.1+t*(.6+i%3*.18));dummy.rotation.set(0,i+t*.3,0);dummy.updateMatrix();dust.current.setMatrixAt(i,dummy.matrix);}dust.current.instanceMatrix.needsUpdate=true;(dust.current.material as MeshBasicMaterial).opacity=ascentBurstParticle(0,t).fade*.18;}}
  if(column.current){column.current.visible=t>=0&&t<.45;(column.current.material as MeshBasicMaterial).opacity=Math.max(0,1-t/.45)*.8;column.current.scale.x=column.current.scale.z=.1+Math.max(0,t)*2;}
  if(light.current)light.current.intensity=!reduced&&t>=0?100*Math.exp(-t*5):0;
  if(cracks.current){cracks.current.opacity=visible?Math.min(.8,t*5)*ascentBurstParticle(0,t).fade:0;cracks.current.color.set(t<.22?'#baffb5':'#24312e');}
 });
 return <group name="dragon-ascent-energy-impact">
  <group ref={flight} visible={false}>
   <mesh><cylinderGeometry args={[.11,.3,13,12]}/><meshBasicMaterial color="#efffd6" transparent opacity={.8} depthWrite={false} toneMapped={false} blending={AdditiveBlending}/></mesh>
   <mesh><coneGeometry args={[1.6,15,20,1,true]}/><meshBasicMaterial color="#7affac" transparent opacity={.15} depthWrite={false} side={2} toneMapped={false}/></mesh>
   {[0,1,2,3].map(i=><mesh key={i} position={[0,-4+i*2.5,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[1.25+i*.1,.025,6,48]}/><meshBasicMaterial color="#c3ffce" transparent opacity={.35} depthWrite={false} toneMapped={false}/></mesh>)}
  </group>
  <group position={[strike.point[0],groundY,strike.point[2]]}>
   <group ref={waves} visible={false}>{[0,1,2].map(i=><mesh key={i} position={[0,.03+i*.15,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.96,1,64]}/><meshBasicMaterial color={i?'#8affb5':'#f1ffd5'} transparent opacity={0} depthWrite={false} side={2} toneMapped={false}/></mesh>)}</group>
   <instancedMesh ref={rocks} args={[undefined,undefined,rockCount]} visible={false} frustumCulled={false}><icosahedronGeometry args={[1,0]}/><meshStandardMaterial color="#4b5b54" roughness={.95} transparent/></instancedMesh>
   <instancedMesh ref={dust} args={[undefined,undefined,dustCount]} visible={false} frustumCulled={false}><sphereGeometry args={[1,10,6]}/><meshBasicMaterial color="#82988c" transparent opacity={.18} depthWrite={false}/></instancedMesh>
   <points ref={sparks} visible={false} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[sparkPositions,3]}/></bufferGeometry><pointsMaterial color="#cfff96" size={.09} transparent opacity={.9} depthWrite={false} toneMapped={false} blending={AdditiveBlending}/></points>
   <mesh ref={column} position={[0,11,0]} visible={false}><cylinderGeometry args={[.12,.55,22,12]}/><meshBasicMaterial color="#e1ffbf" transparent opacity={.8} depthWrite={false} toneMapped={false} blending={AdditiveBlending}/></mesh>
   <lineSegments><bufferGeometry><bufferAttribute attach="attributes-position" args={[crackPositions,3]}/></bufferGeometry><lineBasicMaterial ref={cracks} color="#24312e" transparent opacity={0} depthWrite={false}/></lineSegments>
   <pointLight ref={light} position={[0,2,0]} color="#b7ffac" intensity={0} distance={30} decay={1.5}/>
  </group>
 </group>;
}
