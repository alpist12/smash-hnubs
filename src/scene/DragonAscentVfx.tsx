import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {AdditiveBlending,Group,InstancedMesh,Mesh,MeshBasicMaterial,MeshStandardMaterial,Object3D,Points,PointsMaterial,PointLight,Vector3,LineBasicMaterial} from 'three';
import {useGame} from '../game/store';
import {ascentBurstParticle,rayquazaPosition,type RayquazaStrike} from '../data/rayquaza';
import {BOOTH_WALL_Z,PLATFORM_EDGE_X,STUDIO_START} from '../data/studios';
import config from '../weapons/ascent';
const UP=new Vector3(0,1,0);
const fadeIn=(t:number,d:number)=>Math.max(0,Math.min(1,t/d));
/** Charge aura, comet shroud for the dive, ground lock-on sigil and the sky-piercing impact pillar. */
function AscentSpectacle({strike,groundY}:{strike:RayquazaStrike;groundY:number}){
 const aura=useRef<Group>(null),comet=useRef<Group>(null),sigil=useRef<Group>(null),pillar=useRef<Mesh>(null),dome=useRef<Mesh>(null),shock=useRef<Mesh>(null),scorch=useRef<Mesh>(null),glow=useRef<PointLight>(null);
 const here=useMemo(()=>new Vector3(),[]),ahead=useMemo(()=>new Vector3(),[]);
 useFrame(()=>{
  const age=(performance.now()-strike.born)/1000,t=age-config.impact;
  here.set(...rayquazaPosition(age,'ascent',strike.point));ahead.set(...rayquazaPosition(age+.02,'ascent',strike.point));
  const charging=age>=8.8&&age<11.6,diving=age>=11.6&&t<0;
  if(aura.current){
   aura.current.visible=charging;
   if(charging){
    const power=fadeIn(age-8.8,1.1);aura.current.position.copy(here);
    aura.current.children.forEach((child,i)=>{const mesh=child as Mesh;
     if(i<3){mesh.rotation.set(age*(1.6+i*.7)+i,age*(2.3-i*.5),i*1.1);mesh.scale.setScalar((4.2+i*1.3)*(.6+power*.4)+Math.sin(age*9+i)*.25);}
     else mesh.scale.setScalar(3.4*power+Math.sin(age*14)*.3);
     (mesh.material as MeshBasicMaterial).opacity=power*(i<3?.8:.35);});
   }
  }
  if(comet.current){
   comet.current.visible=diving;
   if(diving){const dir=ahead.clone().sub(here);if(dir.lengthSq()>1e-6)comet.current.quaternion.setFromUnitVectors(UP,dir.normalize().negate());comet.current.position.copy(here);comet.current.children[0].scale.setScalar(1.5+Math.sin(age*40)*.2);}
  }
  const lock=age>=9.9&&t<0;
  if(sigil.current){
   sigil.current.visible=lock;
   if(lock){const close=fadeIn(age-9.9,config.impact-9.9);sigil.current.scale.setScalar(config.radius*(1.6-close*.6));
    sigil.current.children.forEach((child,i)=>{child.rotation.z=age*(i%2?-1:1)*(.8+close*5)*(1+i*.3);((child as Mesh).material as MeshBasicMaterial).opacity=(.45+.45*Math.abs(Math.sin(age*(4+close*16))))*fadeIn(age-9.9,.4);});}
  }
  const hit=Math.max(0,t);
  // A stretched sphere makes a tapered spire that shoots up, then widens and fades.
  if(pillar.current){pillar.current.visible=t>=0&&t<1.4;const rise=Math.min(1,hit*6)*24;pillar.current.position.y=rise;pillar.current.scale.set(1.2+hit*5,Math.max(.1,rise),1.2+hit*5);(pillar.current.material as MeshBasicMaterial).opacity=Math.max(0,1-hit/1.4)*.85;}
  if(dome.current){dome.current.visible=t>=0&&t<1.5;dome.current.scale.setScalar(.1+Math.sqrt(hit)*config.radius*1.9);(dome.current.material as MeshBasicMaterial).opacity=Math.max(0,1-hit/1.5)*.6;}
  if(shock.current){const e=t-.18;shock.current.visible=e>=0&&e<1.3;shock.current.scale.setScalar(.1+Math.sqrt(Math.max(0,e))*24);(shock.current.material as MeshBasicMaterial).opacity=Math.max(0,1-e/1.3)*.9;}
  if(scorch.current){scorch.current.visible=t>=0&&t<4.5;scorch.current.scale.setScalar(config.radius*.9);(scorch.current.material as MeshBasicMaterial).opacity=Math.max(0,1-hit/4.5)*.75;}
  if(glow.current){
   if(t<0){glow.current.position.copy(here);glow.current.intensity=charging?40*fadeIn(age-8.8,1.1):diving?80:0;}
   else{glow.current.position.set(strike.point[0],strike.point[1]+4,strike.point[2]);glow.current.intensity=300*Math.exp(-hit*1.8);}
  }
 });
 const energy={transparent:true,depthWrite:false,toneMapped:false,blending:AdditiveBlending,side:2} as const;
 return <>
  <group ref={aura} visible={false} name="ascent-charge-aura">
   {[0,1,2].map(i=><mesh key={i}><torusGeometry args={[1,.035,6,72]}/><meshBasicMaterial color={i?'#7dffa0':'#f2ffe0'} opacity={0} {...energy}/></mesh>)}
   <mesh><sphereGeometry args={[1,24,16]}/><meshBasicMaterial color="#59ff8a" opacity={0} {...energy}/></mesh>
  </group>
  <group ref={comet} visible={false} name="ascent-comet-shroud">
   <mesh><sphereGeometry args={[1,24,16]}/><meshBasicMaterial color="#7dffa0" opacity={.35} {...energy}/></mesh>
   <mesh position={[0,2.5,0]} scale={[2.6,6,2.6]}><sphereGeometry args={[1,24,16]}/><meshBasicMaterial color="#3fdc6c" opacity={.25} {...energy}/></mesh>
  </group>
  <group position={[strike.point[0],groundY+.05,strike.point[2]]}>
   <group ref={sigil} visible={false} rotation={[-Math.PI/2,0,0]} name="ascent-lock-on-sigil">
    <mesh><ringGeometry args={[.95,1,96]}/><meshBasicMaterial color="#9dffb5" opacity={0} {...energy}/></mesh>
    <mesh><ringGeometry args={[.72,.78,6,1]}/><meshBasicMaterial color="#e8ffe0" opacity={0} {...energy}/></mesh>
    {[0,1,2,3].map(i=><mesh key={i} rotation={[0,0,i*Math.PI/2]}><ringGeometry args={[.5,.58,24,1,0,1.1]}/><meshBasicMaterial color="#6cff93" opacity={0} {...energy}/></mesh>)}
   </group>
   <mesh ref={pillar} visible={false}><sphereGeometry args={[1,32,24]}/><meshBasicMaterial color="#c9ffc4" opacity={0} {...energy}/></mesh>
   <mesh ref={dome} visible={false}><sphereGeometry args={[1,32,16,0,Math.PI*2,0,Math.PI/2]}/><meshBasicMaterial color="#7dffa3" opacity={0} {...energy}/></mesh>
   <mesh ref={shock} visible={false} position={[0,.1,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.9,1,96]}/><meshBasicMaterial color="#f3fff0" opacity={0} {...energy}/></mesh>
   <mesh ref={scorch} visible={false} position={[0,.02,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.15,1,64]}/><meshBasicMaterial color="#2cff6a" opacity={0} {...energy}/></mesh>
  </group>
  <pointLight ref={glow} color="#8dffa4" intensity={0} distance={45} decay={1.3}/>
 </>;
}
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
  <AscentSpectacle strike={strike} groundY={groundY}/>
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
