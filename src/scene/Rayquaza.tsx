import {Suspense,useEffect,useMemo,useRef} from 'react';
import {useAnimations,useGLTF} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {Box3,Group,Vector3} from 'three';
import {useGame} from '../game/store';
import {stopRayquaza} from '../game/audio';
import {dracoMeteor,rayquazaFrame,type RayquazaStrike} from '../data/rayquaza';
import draco from '../weapons/draco';
import ascent from '../weapons/ascent';
const URL=`${import.meta.env.BASE_URL}models/rayquaza/rayquaza.glb`,FORWARD=new Vector3(0,0,1);
function Dragon({strike}:{strike:RayquazaStrike}){
 const gltf=useGLTF(URL),root=useRef<Group>(null);
 const {model,scale,offset}=useMemo(()=>{
  const model=gltf.scene.clone(true);model.updateMatrixWorld(true);
  const box=new Box3().setFromObject(model),size=box.getSize(new Vector3()),center=box.getCenter(new Vector3());
  const scale=6/Math.max(size.x,size.y,size.z);return {model,scale,offset:center.multiplyScalar(-scale)};
 },[gltf.scene]);
 const {actions}=useAnimations(gltf.animations,model);
 useEffect(()=>{
  const clip=strike.skill==='draco'?'animation.rayquaza.attack_1':strike.hits?'animation.rayquaza.attack_2':'animation.rayquaza.fly';
  const action=actions[clip];action?.reset().fadeIn(.2).play();return()=>{action?.fadeOut(.15);};
 },[actions,strike.skill,strike.hits>0]);
 useFrame(()=>{
  if(!root.current)return;const age=(performance.now()-strike.born)/1000,frame=rayquazaFrame(age,strike.skill,strike.point);
  root.current.position.set(...frame.position);
  const direction=strike.skill==='draco'?new Vector3(1,-.12,1):new Vector3(...frame.next).sub(new Vector3(...frame.position));
  if(direction.lengthSq()>.000001)root.current.quaternion.setFromUnitVectors(FORWARD,direction.normalize());
  root.current.visible=age<(strike.skill==='draco'?draco.duration:ascent.impact+1.2);
 });
 return <group ref={root} name="rayquaza-summon"><group position={offset} scale={scale}><primitive object={model}/></group></group>;
}
function DracoRain({strike}:{strike:RayquazaStrike}){
 const root=useRef<Group>(null);
 useFrame(()=>{
  if(!root.current)return;const age=(performance.now()-strike.born)/1000;
  root.current.children.forEach((object,index)=>{const frame=dracoMeteor(strike.point,index,age);object.visible=frame.visible;object.position.set(...frame.position);});
 });
 return <group ref={root} name="draco-meteor-rain">{Array.from({length:draco.count},(_,i)=><group key={i} visible={false} rotation={[.26,0,-.28]}>
  <mesh><icosahedronGeometry args={[.24,1]}/><meshStandardMaterial color="#504469" emissive="#a261f0" emissiveIntensity={1.5} roughness={.7}/></mesh>
  <mesh position={[0,.8,0]}><coneGeometry args={[.25,1.8,8]}/><meshBasicMaterial color="#d9a9ff" transparent opacity={.65} depthWrite={false} toneMapped={false}/></mesh>
 </group>)}</group>;
}
function AscentTrail({strike}:{strike:RayquazaStrike}){
 const root=useRef<Group>(null),waves=useRef<Group>(null);
 useFrame(()=>{
  const age=(performance.now()-strike.born)/1000;
  if(root.current){root.current.visible=age>1.2&&age<ascent.impact;root.current.children.forEach((object,i)=>{const frame=rayquazaFrame(Math.max(0,age-i*.045),strike.skill,strike.point);object.position.set(...frame.position);object.scale.setScalar(.6-i*.035);});}
  if(waves.current){const t=age-ascent.impact;waves.current.visible=t>=0&&t<1.6;waves.current.scale.setScalar(Math.max(.01,t*ascent.radius*1.2));}
 });
 return <><group ref={root} visible={false}>{Array.from({length:12},(_,i)=><mesh key={i}><sphereGeometry args={[.6,8,6]}/><meshBasicMaterial color={i<4?'#d1ff9b':'#65ddb1'} transparent opacity={.3*(1-i/12)} depthWrite={false} toneMapped={false}/></mesh>)}</group>
 <group ref={waves} position={strike.point} visible={false}>{[0,1,2].map(i=><mesh key={i} position={[0,.1+i*.2,0]} rotation={[-Math.PI/2,0,0]} scale={1-i*.16}><ringGeometry args={[.96,1,64]}/><meshBasicMaterial color="#b4ffbd" transparent opacity={.6-i*.15} depthWrite={false} side={2}/></mesh>)}</group></>;
}
function Sequence({strike}:{strike:RayquazaStrike}){
 const sound=useGame(s=>s.sound);
 useEffect(()=>{if(!sound)stopRayquaza();},[sound]);useEffect(()=>()=>stopRayquaza(),[]);
 return <><Suspense fallback={null}><Dragon strike={strike}/></Suspense>{strike.skill==='draco'?<DracoRain strike={strike}/>:<AscentTrail strike={strike}/>}</>;
}
export function Rayquaza(){
 const strike=useGame(s=>s.rayquaza),weapon=useGame(s=>s.weapon);
 useEffect(()=>{if(weapon==='draco'||weapon==='ascent')useGLTF.preload(URL);},[weapon]);
 return strike?<Sequence key={strike.id} strike={strike}/>:null;
}
