import {DragonAscentVfx} from './DragonAscentVfx';
import {Suspense,useEffect,useMemo,useRef,type RefObject} from 'react';
import {useGLTF} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {Box3,Group,Vector3,Quaternion,Euler,Mesh,Line,BufferGeometry,Float32BufferAttribute,LineBasicMaterial} from 'three';
import {useGame} from '../game/store';
import {stopRayquaza} from '../game/audio';
import {RayquazaAtmosphere} from './RayquazaAtmosphere';
import {dracoMeteor,rayquazaFrame,rayquazaJointPose,RAYQUAZA_INTRO,type RayquazaStrike} from '../data/rayquaza';
import draco from '../weapons/draco';
import ascent from '../weapons/ascent';
const URL=`${import.meta.env.BASE_URL}models/rayquaza/rayquaza.glb`,FORWARD=new Vector3(0,0,1),ROLL=new Vector3(0,0,1);
function Dragon({strike,mouth}:{strike:RayquazaStrike;mouth:RefObject<Vector3>}){
 const gltf=useGLTF(URL),root=useRef<Group>(null),orientation=useMemo(()=>new Quaternion(),[]),bank=useMemo(()=>new Quaternion(),[]),localPose=useMemo(()=>new Quaternion(),[]),angles=useMemo(()=>new Euler(),[]);
 const rig=useMemo(()=>{
  const model=gltf.scene.clone(true);model.updateMatrixWorld(true);
  const box=new Box3().setFromObject(model),size=box.getSize(new Vector3()),center=box.getCenter(new Vector3());
  const scale=12/Math.max(size.x,size.y,size.z);
  return {model,scale,offset:center.multiplyScalar(-scale),body:model.getObjectByName('body_200'),tail:Array.from({length:9},(_,i)=>model.getObjectByName(['tail_0_78','tail_1_77','tail_2_76','tail_3_75','tail_4_74','tail_5_73','tail_6_72','tail_7_71','tail_8_70'][i])),neck:['neck_0_165','neck_1_164'].map(name=>model.getObjectByName(name)),head:model.getObjectByName('head_163'),jaw:model.getObjectByName('jaw_158'),arms:['arm_1_182','arm_2_199'].map(name=>model.getObjectByName(name)),elbows:['elbow_1_181','elbow_2_198'].map(name=>model.getObjectByName(name)),hands:['hand_1_180','hand_2_197'].map(name=>model.getObjectByName(name))};
 },[gltf.scene]);
 useFrame((_,delta)=>{
  if(!root.current)return;
  const age=(performance.now()-strike.born)/1000,frame=rayquazaFrame(age,strike.skill,strike.point),pose=rayquazaJointPose(age,strike.skill),blend=1-Math.exp(-delta*9);
  root.current.position.set(...frame.position);
  let direction=new Vector3(...frame.next).sub(new Vector3(...frame.position));
  if(frame.phase==='charge'||frame.phase==='release'||(strike.skill==='draco'&&(frame.phase==='attack')))direction.set(0,-.045,1);
  if(frame.phase==='reveal'){const t=Math.max(0,Math.min(1,(age-RAYQUAZA_INTRO.orbit)/(RAYQUAZA_INTRO.reveal-RAYQUAZA_INTRO.orbit)));direction.normalize().lerp(new Vector3(0,-.045,1),t);}
  if(strike.skill==='ascent'&&age>=11.3&&age<11.6){const angle=(age-11.3)/.3*Math.PI;direction.set(0,Math.cos(angle),Math.sin(angle));}
  if(direction.lengthSq()>.000001){orientation.setFromUnitVectors(FORWARD,direction.normalize()).multiply(bank.setFromAxisAngle(ROLL,frame.bank));root.current.quaternion.slerp(orientation,blend);}
  if(rig.body)rig.body.position.set(0,0,0);
  const apply=(node:typeof rig.head,rotation:[number,number,number])=>{if(node)node.quaternion.slerp(localPose.setFromEuler(angles.set(...rotation)),blend);};
  apply(rig.body,pose.body);
  rig.tail.forEach((node,i)=>apply(node,pose.tail[i]));rig.neck.forEach(node=>apply(node,pose.neck));apply(rig.head,pose.head);apply(rig.jaw,[pose.jaw,0,0]);
  rig.arms.forEach((node,i)=>apply(node,[0,pose.arm*(i?1:-1),pose.armDrop*(i?-1:1)]));
  rig.elbows.forEach((node,i)=>apply(node,[0,pose.elbow*(i?1:-1),0]));rig.hands.forEach((node,i)=>apply(node,[pose.hand,0,pose.hand*(i?-1:1)]));
  root.current.updateMatrixWorld(true);if(rig.head)mouth.current.copy(rig.head.localToWorld(new Vector3(0,-.08,-.7)));
  root.current.visible=age<(strike.skill==='draco'?draco.duration:ascent.duration);
 });
 return <group ref={root} name="rayquaza-custom-joint-motion"><group position={rig.offset} scale={rig.scale}><primitive object={rig.model}/></group></group>;
}
function DracoCharge({strike,mouth}:{strike:RayquazaStrike;mouth:RefObject<Vector3>}){
 const ball=useRef<Group>(null),halo=useRef<Mesh>(null),origin=useRef<Vector3|null>(null);
 useFrame(()=>{
  const age=(performance.now()-strike.born)/1000,charge=Math.max(0,Math.min(1,(age-RAYQUAZA_INTRO.reveal)/(draco.release-RAYQUAZA_INTRO.reveal))),flight=age-draco.release;
  if(!ball.current)return;ball.current.visible=charge>0&&flight<1;
  if(flight>=0){origin.current??=mouth.current.clone();ball.current.position.copy(origin.current).add(new Vector3(flight*2,flight*35,-flight*7));}
  else ball.current.position.copy(mouth.current);
  ball.current.scale.setScalar(.08+charge*1.1);ball.current.rotation.y=age*2;
  if(halo.current){halo.current.scale.setScalar(1.3+Math.sin(age*8)*.1);halo.current.rotation.z=age*2;}
 });
 return <group ref={ball} visible={false} name="draco-energy-charge">
  <mesh><sphereGeometry args={[.65,20,16]}/><meshBasicMaterial color="#fff9df" toneMapped={false}/></mesh>
  <mesh scale={1.5}><sphereGeometry args={[.65,16,12]}/><meshBasicMaterial color="#c985ff" transparent opacity={.27} depthWrite={false} toneMapped={false}/></mesh>
  <mesh ref={halo} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.9,.035,6,48]}/><meshBasicMaterial color="#e4b4ff" toneMapped={false}/></mesh>
  <pointLight color="#d6adff" intensity={5} distance={12} decay={2}/>
 </group>;
}
function FlightWake({strike}:{strike:RayquazaStrike}){
 const line=useMemo(()=>{
  const geometry=new BufferGeometry().setAttribute('position',new Float32BufferAttribute(new Float32Array(65*3),3));
  const object=new Line(geometry,new LineBasicMaterial({color:'#b0e5c8',transparent:true,opacity:.4,depthWrite:false,fog:false}));object.frustumCulled=false;return object;
 },[]);
 useEffect(()=>()=>{line.geometry.dispose();line.material.dispose();},[line]);
 useFrame(()=>{
  const age=(performance.now()-strike.born)/1000,progress=Math.max(0,Math.min(1,(age-RAYQUAZA_INTRO.descent)/(RAYQUAZA_INTRO.orbit-RAYQUAZA_INTRO.descent)));
  line.visible=progress>0&&age<RAYQUAZA_INTRO.reveal;if(!line.visible)return;
  const positions=line.geometry.getAttribute('position');
  for(let i=0;i<65;i++){const sample=rayquazaFrame(RAYQUAZA_INTRO.descent+(RAYQUAZA_INTRO.orbit-RAYQUAZA_INTRO.descent)*progress*i/64,strike.skill,strike.point);positions.setXYZ(i,...sample.position);}
  positions.needsUpdate=true;line.material.opacity=Math.max(0,Math.min(.42,(RAYQUAZA_INTRO.reveal-age)*.3));
 });
 return <primitive object={line}/>;
}
function DracoRain({strike}:{strike:RayquazaStrike}){
 const root=useRef<Group>(null);
 useFrame(()=>{
  if(!root.current)return;const age=(performance.now()-strike.born)/1000;
  root.current.children.forEach((object,index)=>{const frame=dracoMeteor(strike.point,index,age);object.visible=frame.visible;object.position.set(...frame.position);object.scale.setScalar(.85+(index%3)*.22);});
 });
 return <group ref={root} name="draco-meteor-rain">{Array.from({length:draco.count},(_,i)=><group key={i} visible={false} rotation={[.29,0,-.29]}>
  <mesh><icosahedronGeometry args={[.55,2]}/><meshStandardMaterial color="#4d304e" emissive="#ea5516" emissiveIntensity={2.2} roughness={.7}/></mesh>
  <mesh position={[0,2.2,0]}><coneGeometry args={[.52,4.8,12]}/><meshBasicMaterial color="#ffac58" transparent opacity={.75} depthWrite={false} toneMapped={false}/></mesh>
 <mesh scale={1.5}><sphereGeometry args={[.55,12,8]}/><meshBasicMaterial color="#ffd18c" transparent opacity={.22} depthWrite={false} toneMapped={false}/></mesh>
 </group>)}</group>;
}
function Sequence({strike}:{strike:RayquazaStrike}){
 const sound=useGame(s=>s.sound),mouth=useRef(new Vector3());
 useEffect(()=>{if(!sound)stopRayquaza();},[sound]);useEffect(()=>()=>stopRayquaza(),[]);
 return <><RayquazaAtmosphere strike={strike}/><FlightWake strike={strike}/><Suspense fallback={null}><Dragon strike={strike} mouth={mouth}/></Suspense>{strike.skill==='draco'?<><DracoCharge strike={strike} mouth={mouth}/><DracoRain strike={strike}/></>:<DragonAscentVfx strike={strike}/>}</>;
}
export function Rayquaza(){
 const strike=useGame(s=>s.rayquaza),weapon=useGame(s=>s.weapon);
 useEffect(()=>{if(weapon==='draco'||weapon==='ascent')useGLTF.preload(URL);},[weapon]);
 return strike?<Sequence key={strike.id} strike={strike}/>:null;
}
