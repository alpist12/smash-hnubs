import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {AdditiveBlending,Group,InstancedMesh,Mesh,MeshBasicMaterial,MeshStandardMaterial,Object3D,Points,PointsMaterial,PointLight,Vector3,LineBasicMaterial} from 'three';
import {useGame} from '../game/store';
import {ascentBurstParticle,rayquazaPosition,type RayquazaStrike} from '../data/rayquaza';
import {BOOTH_WALL_Z,PLATFORM_EDGE_X,STUDIO_START} from '../data/studios';
import config from '../weapons/ascent';
const UP=new Vector3(0,1,0);
export function DragonAscentVfx({strike}:{strike:RayquazaStrike}){
 const quality=useGame(s=>s.quality),rockCount=quality==='low'?24:quality==='medium'?44:64,sparkCount=quality==='low'?60:quality==='medium'?100:160,dustCount=quality==='low'?12:20;
 const flight=useRef<Group>(null),waves=useRef<Group>(null),rocks=useRef<InstancedMesh>(null),dust=useRef<InstancedMesh>(null),sparks=useRef<Points>(null),column=useRef<Mesh>(null),light=useRef<PointLight>(null),cracks=useRef<LineBasicMaterial>(null);
 const dummy=useMemo(()=>new Object3D(),[]),sparkPositions=useMemo(()=>new Float32Array(sparkCount*3),[sparkCount]);
 const ribbons=useRef<Mesh[]>([]),ribbonPositions=useMemo(()=>Array.from({length:3},()=>new Float32Array(41*6)),[]);
 const ribbonIndices=useMemo(()=>{const indices:number[]=[];for(let i=0;i<40;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}return new Uint16Array(indices);},[]);
 const crown=useMemo(()=>{const vertices:number[]=[];for(let i=0;i<32;i++){const a=i*Math.PI/16,b=a+.085,height=1+(i*13%9)*.3;vertices.push(Math.cos(a)*.6,0,Math.sin(a)*.6,Math.cos(b)*1.3,height,Math.sin(b)*1.3,Math.cos(a+.17)*.8,0,Math.sin(a+.17)*.8);}return new Float32Array(vertices);},[]);
 const groundY=strike.point[2]<STUDIO_START&&strike.point[2]>BOOTH_WALL_Z&&strike.point[0]>PLATFORM_EDGE_X?.145:.025;
 const crackPositions=useMemo(()=>{
  const points:number[]=[];for(let i=0;i<16;i++){const a=i*2.399963,r=2.2+i%4*.5;const p=[Math.cos(a)*r*.35,0,Math.sin(a)*r*.35],q=[Math.cos(a+.13)*r,0,Math.sin(a+.13)*r];points.push(0,0,0,...p,...p,...q);}
  return new Float32Array(points);
 },[]);
 useFrame(()=>{
  const age=(performance.now()-strike.born)/1000,t=age-config.impact,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(flight.current){
   flight.current.visible=age>=9.9&&t<.04;
   if(flight.current.visible)ribbons.current.forEach((mesh,strand)=>{
    const positions=mesh.geometry.getAttribute('position');
    for(let i=0;i<=40;i++){
     const u=i/40,time=Math.min(age,config.impact)-u*.38,p=new Vector3(...rayquazaPosition(time,'ascent',strike.point));
     const tangent=new Vector3(...rayquazaPosition(time+.005,'ascent',strike.point)).sub(p).normalize();
     const right=new Vector3().crossVectors(tangent,Math.abs(tangent.y)>.95?new Vector3(1,0,0):UP).normalize(),normal=new Vector3().crossVectors(right,tangent);
     const angle=u*7+strand*Math.PI*2/3+age*2,radius=Math.sin(u*Math.PI)*1.7;
     p.addScaledVector(right,Math.cos(angle)*radius).addScaledVector(normal,Math.sin(angle)*radius);
     const width=(.035+.2*Math.sin(u*Math.PI))*(1-u);
     const edge=right.multiplyScalar(width);positions.setXYZ(i*2,p.x-edge.x,p.y-edge.y,p.z-edge.z);positions.setXYZ(i*2+1,p.x+edge.x,p.y+edge.y,p.z+edge.z);
    }
    positions.needsUpdate=true;
   });
  }
  if(waves.current){waves.current.visible=t>=0&&t<2;waves.current.children.forEach((child,i)=>{const mesh=child as Mesh,elapsed=Math.max(0,t-i*.07);mesh.scale.setScalar(.01+Math.sqrt(elapsed)*11);(mesh.material as MeshBasicMaterial).opacity=Math.max(0,1-elapsed/1.6)*(.8-i*.12);});}
  const visible=t>=0&&t<3;
  if(rocks.current){rocks.current.visible=visible;if(visible){for(let i=0;i<rockCount;i++){const particle=ascentBurstParticle(i,t);dummy.position.set(...particle.position);dummy.scale.setScalar(particle.size);dummy.rotation.set(t*(i%4+2),t*3,i+t);dummy.updateMatrix();rocks.current.setMatrixAt(i,dummy.matrix);}rocks.current.instanceMatrix.needsUpdate=true;(rocks.current.material as MeshStandardMaterial).opacity=ascentBurstParticle(0,t).fade;}}
  if(sparks.current){sparks.current.visible=visible;if(visible){const positions=sparks.current.geometry.getAttribute('position');for(let i=0;i<sparkCount;i++){const p=ascentBurstParticle(i+31,t);positions.setXYZ(i,p.position[0]*.8,p.position[1]*1.3+.1,p.position[2]*.8);}positions.needsUpdate=true;(sparks.current.material as PointsMaterial).opacity=ascentBurstParticle(0,t).fade*.9;}}
  if(dust.current){dust.current.visible=visible;if(visible){for(let i=0;i<dustCount;i++){const a=i*2.399963,r=Math.max(0,t)*(1+i%4)*1.1;dummy.position.set(Math.cos(a)*r,.1+Math.sqrt(t)*(.5+i%3*.3),Math.sin(a)*r);dummy.scale.setScalar(.1+t*(.6+i%3*.18));dummy.rotation.set(0,i+t*.3,0);dummy.updateMatrix();dust.current.setMatrixAt(i,dummy.matrix);}dust.current.instanceMatrix.needsUpdate=true;(dust.current.material as MeshBasicMaterial).opacity=ascentBurstParticle(0,t).fade*.18;}}
  if(column.current){column.current.visible=t>=0&&t<.7;(column.current.material as MeshBasicMaterial).opacity=Math.max(0,1-t/.7)*.75;column.current.scale.set(.2+Math.max(0,t)*9,Math.max(.01,1-t/.7),.2+Math.max(0,t)*9);}
  if(light.current)light.current.intensity=!reduced&&t>=0?100*Math.exp(-t*5):0;
  if(cracks.current){cracks.current.opacity=visible?Math.min(.8,t*5)*ascentBurstParticle(0,t).fade:0;cracks.current.color.set(t<.22?'#baffb5':'#24312e');}
 });
 return <group name="dragon-ascent-energy-impact">
  <group ref={flight} visible={false} name="ascent-curved-light-wake">
   {ribbonPositions.map((positions,i)=><mesh key={i} ref={mesh=>{if(mesh)ribbons.current[i]=mesh;}} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions,3]}/><bufferAttribute attach="index" args={[ribbonIndices,1]}/></bufferGeometry><meshBasicMaterial color={i===0?'#f0ffda':'#83ff8e'} transparent opacity={i===0?.95:.5} side={2} depthWrite={false} toneMapped={false} blending={AdditiveBlending}/></mesh>)}
  </group>
  <group position={[strike.point[0],groundY,strike.point[2]]}>
   <group ref={waves} visible={false}>{[0,1,2].map(i=><mesh key={i} position={[0,.03+i*.15,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.96,1,64]}/><meshBasicMaterial color={i?'#8affb5':'#f1ffd5'} transparent opacity={0} depthWrite={false} side={2} toneMapped={false}/></mesh>)}</group>
   <instancedMesh ref={rocks} args={[undefined,undefined,rockCount]} visible={false} frustumCulled={false}><icosahedronGeometry args={[1,0]}/><meshStandardMaterial color="#4b5b54" roughness={.95} transparent/></instancedMesh>
   <instancedMesh ref={dust} args={[undefined,undefined,dustCount]} visible={false} frustumCulled={false}><icosahedronGeometry args={[1,1]}/><meshBasicMaterial color="#82988c" transparent opacity={.18} depthWrite={false}/></instancedMesh>
   <points ref={sparks} visible={false} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[sparkPositions,3]}/></bufferGeometry><pointsMaterial color="#cfff96" size={.09} transparent opacity={.9} depthWrite={false} toneMapped={false} blending={AdditiveBlending}/></points>
   <mesh ref={column} visible={false} name="ascent-radial-energy-burst"><bufferGeometry><bufferAttribute attach="attributes-position" args={[crown,3]}/></bufferGeometry><meshBasicMaterial color="#d9ffc2" transparent opacity={.8} side={2} depthWrite={false} toneMapped={false} blending={AdditiveBlending}/></mesh>
   <lineSegments><bufferGeometry><bufferAttribute attach="attributes-position" args={[crackPositions,3]}/></bufferGeometry><lineBasicMaterial ref={cracks} color="#24312e" transparent opacity={0} depthWrite={false}/></lineSegments>
   <pointLight ref={light} position={[0,2,0]} color="#b7ffac" intensity={0} distance={30} decay={1.5}/>
  </group>
 </group>;
}
