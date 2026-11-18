import {useEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {AdditiveBlending,EdgesGeometry,Group,IcosahedronGeometry,InstancedMesh,Mesh,MeshBasicMaterial,MeshStandardMaterial,Object3D,PointLight,Vector3} from 'three';
import {dracoMeteor,dracoPoint,ascentBurstParticle,rayquazaPosition,type RayquazaStrike} from '../data/rayquaza';
import {useGame} from '../game/store';
import config from '../weapons/draco';
const UP=new Vector3(0,1,0),WAKE=new Vector3(-16,48,-10).normalize();
const LAST=config.firstImpact+(config.count-1)*config.interval;
const energy={transparent:true,depthWrite:false,toneMapped:false,blending:AdditiveBlending,side:2} as const;
/** Orb bursts in the sky, a rift opens facing the camera, and the target zone is marked on the ground. */
function DracoSpectacle({strike}:{strike:RayquazaStrike}){
 const camera=useThree(s=>s.camera),burst=useRef<Group>(null),rift=useRef<Group>(null),zone=useRef<Group>(null);
 const apex=useMemo(()=>new Vector3(...rayquazaPosition(config.release,'draco',strike.point)).add(new Vector3(2,35,-7)),[strike]);
 useFrame(()=>{
  const age=(performance.now()-strike.born)/1000,pop=age-(config.release+1);
  if(burst.current){burst.current.visible=pop>=0&&pop<1.6;if(burst.current.visible){burst.current.quaternion.copy(camera.quaternion);
   burst.current.children.forEach((child,i)=>{const e=Math.max(0,pop-i*.12);child.scale.setScalar(.5+e*(i?34:16));((child as Mesh).material as MeshBasicMaterial).opacity=Math.max(0,1-e/(i?1.4:.9))*(i?.8:.9);});}}
  const open=Math.min(1,Math.max(0,(age-config.release-1)/.8)),close=Math.max(0,Math.min(1,(LAST+.8-age)/.8));
  if(rift.current){rift.current.visible=open>0&&close>0;if(rift.current.visible){rift.current.quaternion.copy(camera.quaternion);
   rift.current.children.forEach((child,i)=>{child.rotation.z=age*(i%2?-.9:1.4)*(1+i*.2);child.scale.setScalar((7+i*1.6)*open);((child as Mesh).material as MeshBasicMaterial).opacity=open*close*(i===0?.22:.75-i*.1)*(.85+.15*Math.sin(age*7+i));});}}
  const mark=Math.min(1,Math.max(0,(age-config.release)/.6))*close;
  if(zone.current){zone.current.visible=mark>0;zone.current.children.forEach((child,i)=>{child.rotation.z=age*(i%2?-.35:.5);((child as Mesh).material as MeshBasicMaterial).opacity=mark*(i===0?.12:.6)*(.7+.3*Math.sin(age*5+i));});}
 });
 const reach=config.spread+config.radius;
 return <>
  <group ref={burst} position={apex} visible={false} name="draco-sky-burst">
   <mesh><circleGeometry args={[1,48]}/><meshBasicMaterial color="#f3e2ff" opacity={0} {...energy}/></mesh>
   <mesh><ringGeometry args={[.9,1,96]}/><meshBasicMaterial color="#c58bff" opacity={0} {...energy}/></mesh>
  </group>
  <group ref={rift} position={[strike.point[0],strike.point[1]+20,strike.point[2]-6]} visible={false} name="draco-sky-rift">
   <mesh><circleGeometry args={[1,64]}/><meshBasicMaterial color="#7a2cff" opacity={0} {...energy}/></mesh>
   <mesh><ringGeometry args={[.94,1,96]}/><meshBasicMaterial color="#e6c8ff" opacity={0} {...energy}/></mesh>
   <mesh><ringGeometry args={[.62,.68,8,1]}/><meshBasicMaterial color="#b578ff" opacity={0} {...energy}/></mesh>
   {[0,1,2].map(i=><mesh key={i} rotation={[0,0,i*Math.PI*2/3]}><ringGeometry args={[.38,.45,24,1,0,1.4]}/><meshBasicMaterial color="#ffd9a8" opacity={0} {...energy}/></mesh>)}
  </group>
  <group ref={zone} position={[strike.point[0],strike.point[1]+.06,strike.point[2]]} rotation={[-Math.PI/2,0,0]} visible={false} name="draco-target-zone">
   <mesh><circleGeometry args={[reach,64]}/><meshBasicMaterial color="#8d3cff" opacity={0} {...energy}/></mesh>
   <mesh><ringGeometry args={[reach-.12,reach,128]}/><meshBasicMaterial color="#d6b0ff" opacity={0} {...energy}/></mesh>
   <mesh><ringGeometry args={[reach*.82,reach*.82+.08,12,1]}/><meshBasicMaterial color="#b57cff" opacity={0} {...energy}/></mesh>
  </group>
 </>;
}
function MeteorRock({strike,index,geometry,edges}:{strike:RayquazaStrike;index:number;geometry:IcosahedronGeometry;edges:EdgesGeometry}){
 const flight=useRef<Group>(null),impact=useRef<Group>(null),wave=useRef<Mesh>(null),fire=useRef<Mesh>(null),chips=useRef<InstancedMesh>(null),smoke=useRef<InstancedMesh>(null);
 const marker=useRef<Mesh>(null),pillar=useRef<Mesh>(null),dome=useRef<Mesh>(null);
 const quality=useGame(s=>s.quality),count=quality==='low'?12:24;
 const dummy=useMemo(()=>new Object3D(),[]),point=dracoPoint(strike.point,index),radius=index===0?1.5:1.05+index%3*.18,finale=index===config.count-1?2:1;
 useFrame(()=>{
  const age=(performance.now()-strike.born)/1000,frame=dracoMeteor(strike.point,index,age),t=age-config.firstImpact-index*config.interval;
  if(marker.current){const lead=-t;marker.current.visible=lead>0&&lead<1.4;if(marker.current.visible){marker.current.scale.setScalar(config.radius*(.6+lead*.9));marker.current.rotation.z=age*3;(marker.current.material as MeshBasicMaterial).opacity=(1-lead/1.4)*(.5+.5*Math.abs(Math.sin(age*(10+12*(1-lead)))));}}
  const hit=Math.max(0,t);
  if(pillar.current){pillar.current.visible=t>=0&&t<.6;const rise=Math.min(1,hit*9)*9*finale;pillar.current.position.y=rise;pillar.current.scale.set((.9+hit*3)*finale,Math.max(.1,rise),(.9+hit*3)*finale);(pillar.current.material as MeshBasicMaterial).opacity=Math.max(0,1-hit/.6)*.6;}
  if(dome.current){dome.current.visible=t>=0&&t<.9;dome.current.scale.setScalar(.1+Math.sqrt(hit)*config.radius*1.7*finale);(dome.current.material as MeshBasicMaterial).opacity=Math.max(0,1-hit/.9)*.55;}
  if(flight.current){flight.current.visible=frame.visible;flight.current.position.set(...frame.position);flight.current.quaternion.setFromUnitVectors(UP,WAKE);flight.current.scale.setScalar(radius);flight.current.children[0].rotation.set(age*.9,index,age*.5);}
  if(impact.current)impact.current.visible=t>=0&&t<2.6;
  if(wave.current){wave.current.scale.setScalar(.01+Math.sqrt(Math.max(0,t))*6);(wave.current.material as MeshBasicMaterial).opacity=Math.max(0,1-t/1.2)*.8;}
  if(fire.current){fire.current.scale.set(1+Math.max(0,t)*3,1.6+Math.max(0,t)*5,1+Math.max(0,t)*3);(fire.current.material as MeshBasicMaterial).opacity=Math.max(0,1-t/.45)*.8;}
  if(chips.current&&t>=0&&t<2.6){for(let i=0;i<count;i++){const p=ascentBurstParticle(i+index*9,t);dummy.position.set(p.position[0]*.65,p.position[1]*.75,p.position[2]*.65);dummy.rotation.set(t*(i%4+1),i+t*3,t*2);dummy.scale.setScalar(p.size*(index===0?1.7:1.2));dummy.updateMatrix();chips.current.setMatrixAt(i,dummy.matrix);}chips.current.instanceMatrix.needsUpdate=true;(chips.current.material as MeshStandardMaterial).opacity=Math.min(1,(2.6-t)*2);}
  if(smoke.current){smoke.current.visible=frame.visible||(t>=0&&t<2.3);if(smoke.current.visible){for(let i=0;i<12;i++){
   if(t<0){const lag=.025*(i+1),past=dracoMeteor(strike.point,index,age-lag);dummy.position.set(...past.position);dummy.scale.setScalar(radius*(.5+i*.1));}
   else{const a=i*2.399963,r=t*(1+i%3);dummy.position.set(point[0]+Math.cos(a)*r,point[1]+.7+t*(1+i%3*.5),point[2]+Math.sin(a)*r);dummy.scale.setScalar(.4+t*(.8+i%3*.25));}
   dummy.rotation.set(index+i,age*.4,0);dummy.updateMatrix();smoke.current.setMatrixAt(i,dummy.matrix);
  }smoke.current.instanceMatrix.needsUpdate=true;(smoke.current.material as MeshBasicMaterial).opacity=t<0?.13:Math.max(0,1-t/2.3)*.2;}}
 });
 return <group name="draco-heavy-meteor">
  <group ref={flight} visible={false}>
   <group><mesh geometry={geometry}><meshStandardMaterial color="#302721" roughness={.95} emissive="#b52e08" emissiveIntensity={.9} flatShading/></mesh><lineSegments geometry={edges}><lineBasicMaterial color="#ffb048" toneMapped={false}/></lineSegments></group>
   <mesh scale={1.14}><sphereGeometry args={[1,14,10]}/><meshBasicMaterial color="#ff6b1a" transparent opacity={.23} depthWrite={false} toneMapped={false} blending={AdditiveBlending}/></mesh>
   <mesh scale={1.75}><sphereGeometry args={[1,16,12]}/><meshBasicMaterial color="#a45cff" opacity={.22} {...energy}/></mesh>
   <mesh position={[0,4,0]}><coneGeometry args={[.95,8,16]}/><meshBasicMaterial color="#f36a22" transparent opacity={.4} depthWrite={false} toneMapped={false} blending={AdditiveBlending}/></mesh>
   <mesh position={[0,2.5,0]}><coneGeometry args={[.65,5,12]}/><meshBasicMaterial color="#ffdf8c" transparent opacity={.75} depthWrite={false} toneMapped={false} blending={AdditiveBlending}/></mesh>
  </group>
  <instancedMesh ref={smoke} args={[undefined,undefined,12]} visible={false} frustumCulled={false}><icosahedronGeometry args={[1,1]}/><meshBasicMaterial color="#73695d" transparent opacity={.15} depthWrite={false}/></instancedMesh>
  <mesh ref={marker} position={[point[0],point[1]+.08,point[2]]} rotation={[-Math.PI/2,0,0]} visible={false}><ringGeometry args={[.86,1,6,1]}/><meshBasicMaterial color="#ffb36b" opacity={0} {...energy}/></mesh>
  <group position={[point[0],point[1]+.05,point[2]]}>
   <mesh ref={pillar} visible={false}><sphereGeometry args={[1,20,14]}/><meshBasicMaterial color="#e2b4ff" opacity={0} {...energy}/></mesh>
   <mesh ref={dome} visible={false}><sphereGeometry args={[1,24,12,0,Math.PI*2,0,Math.PI/2]}/><meshBasicMaterial color="#9a52ff" opacity={0} {...energy}/></mesh>
  </group>
  <group ref={impact} position={[point[0],point[1]+.05,point[2]]} visible={false}>
   <mesh ref={wave} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.9,1,48]}/><meshBasicMaterial color="#ffb76d" transparent depthWrite={false} side={2} toneMapped={false}/></mesh>
   <mesh ref={fire} position={[0,.8,0]}><sphereGeometry args={[1,12,8]}/><meshBasicMaterial color="#ffdf9a" transparent depthWrite={false} toneMapped={false} blending={AdditiveBlending}/></mesh>
   <instancedMesh ref={chips} args={[undefined,undefined,count]} frustumCulled={false}><icosahedronGeometry args={[1,0]}/><meshStandardMaterial color="#564238" emissive="#6b210b" roughness={1} transparent/></instancedMesh>
  </group>
 </group>;
}
export function DracoMeteorVfx({strike}:{strike:RayquazaStrike}){
 const geometry=useMemo(()=>{const g=new IcosahedronGeometry(1,2),p=g.getAttribute('position');for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=1+.12*Math.sin(x*13+y*7+z*19);p.setXYZ(i,x*r,y*r*.9,z*r);}g.computeVertexNormals();return g;},[]);
 const edges=useMemo(()=>new EdgesGeometry(geometry,12),[geometry]);
 useEffect(()=>()=>{geometry.dispose();edges.dispose();},[geometry,edges]);
 const flash=useRef<PointLight>(null);
 // One light hops to whichever meteor landed last, so eight impacts cost one shader light.
 useFrame(()=>{
  if(!flash.current)return;
  const since=(performance.now()-strike.born)/1000-config.firstImpact;
  if(since<0){flash.current.intensity=0;return;}
  const index=Math.min(config.count-1,Math.floor(since/config.interval)),p=dracoPoint(strike.point,index);
  flash.current.position.set(p[0],p[1]+2.5,p[2]);flash.current.intensity=(index===config.count-1?260:130)*Math.exp(-(since-index*config.interval)*(index===config.count-1?2.5:5));
 });
 return <group name="draco-meteor-barrage"><DracoSpectacle strike={strike}/>{Array.from({length:config.count},(_,index)=><MeteorRock key={index} strike={strike} index={index} geometry={geometry} edges={edges}/>)}<pointLight ref={flash} color="#ffa25a" intensity={0} distance={28} decay={1.4}/></group>;
}
