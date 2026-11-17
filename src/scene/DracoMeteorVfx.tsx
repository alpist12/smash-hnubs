import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {AdditiveBlending,EdgesGeometry,Group,IcosahedronGeometry,InstancedMesh,Mesh,MeshBasicMaterial,MeshStandardMaterial,Object3D,PointLight,Vector3} from 'three';
import {dracoMeteor,dracoPoint,ascentBurstParticle,type RayquazaStrike} from '../data/rayquaza';
import {useGame} from '../game/store';
import config from '../weapons/draco';
const UP=new Vector3(0,1,0),WAKE=new Vector3(-16,48,-10).normalize();
function MeteorRock({strike,index,geometry,edges}:{strike:RayquazaStrike;index:number;geometry:IcosahedronGeometry;edges:EdgesGeometry}){
 const flight=useRef<Group>(null),impact=useRef<Group>(null),wave=useRef<Mesh>(null),fire=useRef<Mesh>(null),chips=useRef<InstancedMesh>(null),smoke=useRef<InstancedMesh>(null);
 const quality=useGame(s=>s.quality),count=quality==='low'?12:24;
 const dummy=useMemo(()=>new Object3D(),[]),point=dracoPoint(strike.point,index),radius=index===0?1.5:1.05+index%3*.18;
 useFrame(()=>{
  const age=(performance.now()-strike.born)/1000,frame=dracoMeteor(strike.point,index,age),t=age-config.firstImpact-index*config.interval;
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
   <mesh position={[0,4,0]}><coneGeometry args={[.95,8,16]}/><meshBasicMaterial color="#f36a22" transparent opacity={.4} depthWrite={false} toneMapped={false} blending={AdditiveBlending}/></mesh>
   <mesh position={[0,2.5,0]}><coneGeometry args={[.65,5,12]}/><meshBasicMaterial color="#ffdf8c" transparent opacity={.75} depthWrite={false} toneMapped={false} blending={AdditiveBlending}/></mesh>
  </group>
  <instancedMesh ref={smoke} args={[undefined,undefined,12]} visible={false} frustumCulled={false}><icosahedronGeometry args={[1,1]}/><meshBasicMaterial color="#73695d" transparent opacity={.15} depthWrite={false}/></instancedMesh>
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
  flash.current.position.set(p[0],p[1]+2.5,p[2]);flash.current.intensity=110*Math.exp(-(since-index*config.interval)*5);
 });
 return <group name="draco-meteor-barrage">{Array.from({length:config.count},(_,index)=><MeteorRock key={index} strike={strike} index={index} geometry={geometry} edges={edges}/>)}<pointLight ref={flash} color="#ffa25a" intensity={0} distance={28} decay={1.4}/></group>;
}
