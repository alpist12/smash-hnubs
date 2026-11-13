import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Color, DoubleSide, Group, InstancedMesh, Object3D, Quaternion, Vector3 } from 'three';
import type { CharacterAppearance } from '../data/characters';
import { yujinHairGeometry, parkaGeometry, parkaLapelGeometry, yujinSleeveGeometry } from './characterGeometry';
import { maps, bumps } from './materials';
import { CharacterGait } from './characterGait';
import { useFrame } from '@react-three/fiber';
import type { RefObject } from 'react';
import { useGame } from '../game/store';
import { CHIN_Y, collarGeometry, facePatch, faceStroke, furGeometry, hairGeometry, headGeometry, sleeveGeometry, stroke, torsoGeometry, trousersGeometry } from './characterGeometry';

function Fur() {
  const quality=useGame(s=>s.quality), mesh=useRef<InstancedMesh>(null);
  const count=quality==='low'?480:quality==='medium'?900:1400;
  const geometry=useMemo(furGeometry,[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useLayoutEffect(()=>{
    const current = mesh.current;
    if(!current) return;
    const transform=new Object3D(), up=new Vector3(0,1,0), normal=new Vector3(), twist=new Quaternion();
    const dark=new Color('#718082'),light=new Color('#c4cdca');
    for(let i=0;i<count;i++) {
      const section=i<count*.74?0:i<count*.87?-1:1;
      const r=section===0?[.242,.155,.184]:[.055,.12,.10];
      const c=section===0?[0,1.94,-.025]:[section*.186,1.79,-.028];
      const first=section===0?0:section===-1?Math.ceil(count*.74):Math.ceil(count*.87);
      const end=section===0?Math.ceil(count*.74):section===-1?Math.ceil(count*.87):count;
      const y=1-2*((i-first+.5)/(end-first)), a=i*2.3999632297, radius=Math.sqrt(1-y*y);
      const x=Math.cos(a)*radius,z=Math.sin(a)*radius;
      transform.position.set(c[0]+x*r[0],c[1]+y*r[1],c[2]+z*r[2]);
      normal.set(x/r[0],y/r[1],z/r[2]).normalize();
      transform.quaternion.setFromUnitVectors(up,normal).multiply(twist.setFromAxisAngle(up,i*1.71));
      const length=.026+(Math.sin(i*17.31)*.5+.5)*.031;
      transform.scale.set(length,length,length); transform.updateMatrix();
      current.setMatrixAt(i,transform.matrix);
      current.setColorAt(i,dark.clone().lerp(light,(Math.sin(i*7.71)*.5+.5)*.85));
    }
    current.instanceMatrix.needsUpdate=true;
    if(current.instanceColor) current.instanceColor.needsUpdate=true;
    current.computeBoundingSphere();
    return ()=>{ current.dispose(); };
  },[count]);
  return <instancedMesh ref={mesh} args={[geometry,undefined,count]} castShadow dispose={null}>
    <meshStandardMaterial roughness={1} />
  </instancedMesh>;
}

export const CharacterModel=memo(function CharacterModel({ motion, appearance = 'wonjae' }: { motion?: RefObject<{ speed: number }>; appearance?: CharacterAppearance }) {
  const yujin = appearance === 'yujin';
  const coatColor = '#707466', topColor = yujin ? '#e7e5dd' : '#244b3e';
  const legs = useRef<(Group | null)[]>([]), knees = useRef<(Group | null)[]>([]), feet = useRef<(Group | null)[]>([]), arms = useRef<(Group | null)[]>([]);
  const torso = useRef<Group>(null), gait = useRef(new CharacterGait());
  useFrame((_, delta) => {
    const pose = gait.current; pose.step(motion?.current.speed ?? 0, delta);
    if (torso.current) { torso.current.position.y = pose.bob; torso.current.rotation.z = Math.sin(pose.phase) * .012 * pose.blend; }
    for (let i = 0; i < 2; i++) {
      const leg = pose.leg(i);
      if (legs.current[i]) legs.current[i]!.rotation.x = leg.hip;
      if (knees.current[i]) knees.current[i]!.rotation.x = leg.knee;
      if (feet.current[i]) feet.current[i]!.rotation.x = leg.ankle;
      if (arms.current[i]) arms.current[i]!.rotation.x = Math.sin(pose.phase + i * Math.PI) * .16 * pose.blend;
    }
  });
  const geometry=useMemo(()=>({
    head:headGeometry(),hair:yujin?yujinHairGeometry():hairGeometry(),hairShine:yujin?yujinHairGeometry(true):hairGeometry(true),torso:torsoGeometry(),coat:yujin?parkaGeometry():null,lapelL:yujin?parkaLapelGeometry(-1):null,lapelR:yujin?parkaLapelGeometry(1):null,
    sleeveL:yujin?yujinSleeveGeometry(-1):sleeveGeometry(-1),sleeveR:yujin?yujinSleeveGeometry(1):sleeveGeometry(1),legL:trousersGeometry(-1,'upper'),legR:trousersGeometry(1,'upper'),shinL:trousersGeometry(-1,'lower'),shinR:trousersGeometry(1,'lower'),
    collarL:collarGeometry(-1),collarR:collarGeometry(1),
    eyeL:facePatch([[-.035,.250],[-.060,.254],[-.090,.251],[-.121,.244],[-.099,.241],[-.073,.242],[-.051,.243]],.004),
    eyeR:facePatch([[.035,.250],[.060,.254],[.090,.251],[.121,.244],[.099,.241],[.073,.242],[.051,.243]],.004),
    irisL:facePatch([[-.065,.251],[-.073,.253],[-.080,.249],[-.080,.243],[-.070,.242],[-.065,.245]],.005),
    irisR:facePatch([[.070,.252],[.078,.252],[.086,.248],[.086,.243],[.075,.242],[.070,.246]],.005),
    rimL:faceStroke([[-.035,.250],[-.060,.254],[-.090,.251],[-.121,.244]],.0014,.005),
    rimR:faceStroke([[.035,.250],[.060,.254],[.090,.251],[.121,.244]],.0014,.005),
    browL:faceStroke([[-.034,.296],[-.060,.303],[-.092,.300],[-.121,.291]],.0037),
    browR:faceStroke([[.034,.296],[.060,.303],[.092,.300],[.121,.291]],.0037),
    lidL:faceStroke([[-.035,.267],[-.067,.276],[-.092,.275],[-.120,.261]],.0022),
    lidR:faceStroke([[.035,.267],[.067,.276],[.092,.275],[.120,.261]],.0022),
    lowerL:faceStroke([[-.040,.241],[-.075,.238],[-.109,.240]],.0015),
    lowerR:faceStroke([[.040,.241],[.075,.238],[.109,.240]],.0015),
    mouth:facePatch([[-.053,.119],[-.027,.114],[.008,.115],[.035,.123],[.052,.131],[.040,.112],[.013,.105],[-.018,.106],[-.040,.111]],.004),
    teeth:facePatch([[-.039,.116],[-.010,.113],[.020,.119],[.043,.127],[.036,.120],[.011,.112],[-.020,.111]],.005),
    lip:faceStroke([[-.046,.110],[-.022,.102],[.008,.101],[.032,.109],[.050,.126]],.0025,.005),
    nostrilL:faceStroke([[-.030,.172],[-.022,.168],[-.014,.171]],.0017,.002),
    nostrilR:faceStroke([[.030,.172],[.022,.168],[.014,.171]],.0017,.002),
    hem:stroke([[-.18,.793,.082],[-.09,.786,.125],[0,.784,.134],[.09,.786,.125],[.18,.793,.082]],.006),
  }),[yujin]);
  useEffect(()=>()=>Object.values(geometry).forEach(g=>g?.dispose()),[geometry]);
  return <group ref={torso} name={`sculpted-character-${appearance}`}>
    <mesh geometry={geometry.torso} castShadow receiveShadow><meshStandardMaterial color={topColor} roughness={.96} /></mesh>
    {!yujin && <mesh geometry={geometry.hem}><meshStandardMaterial color="#1c3e34" roughness={1} /></mesh>}
    {!yujin && <>
    <mesh geometry={geometry.collarL} castShadow><meshStandardMaterial color="#e9e6dc" side={DoubleSide} roughness={.9} /></mesh>
    <mesh geometry={geometry.collarR} castShadow><meshStandardMaterial color="#e9e6dc" side={DoubleSide} roughness={.9} /></mesh>
    <mesh position={[0,1.399,0]}><cylinderGeometry args={[.071,.084,.042,28,1,true]} /><meshStandardMaterial color="#e9e6dc" side={DoubleSide} roughness={.9} /></mesh>
    <mesh position={[0,1.432,-.005]}><cylinderGeometry args={[.063,.067,.12,24]} /><meshStandardMaterial color="#ba8d78" roughness={.8} /></mesh>
    </>}
    <group position={[0,CHIN_Y,0]} scale={[yujin ? .8 : 1, yujin ? .78 : 1, yujin ? .9 : 1]}>
      <mesh geometry={geometry.head} castShadow receiveShadow><meshStandardMaterial vertexColors color="#fff" roughness={.86} /></mesh>
      <>
      {(['eyeL','eyeR','browL','browR'] as const).map(key=><mesh key={key} geometry={geometry[key]}><meshStandardMaterial color={key.startsWith('brow')?'#29231f':'#c7b9a7'} roughness={.9} /></mesh>)}
      {(['irisL','irisR','rimL','rimR'] as const).map(key=><mesh key={key} geometry={geometry[key]}><meshStandardMaterial color="#392b25" roughness={.8} /></mesh>)}
      {(['lidL','lidR','lowerL','lowerR'] as const).map(key=><mesh key={key} geometry={geometry[key]}><meshStandardMaterial color="#b78773" roughness={.85} /></mesh>)}
      <mesh geometry={geometry.mouth}><meshStandardMaterial color="#654139" roughness={.8} /></mesh>
      <mesh geometry={geometry.teeth}><meshStandardMaterial color="#dfd8c7" roughness={.6} /></mesh>
      <mesh geometry={geometry.lip}><meshStandardMaterial color="#b47c70" roughness={.8} /></mesh>
      {(['nostrilL','nostrilR'] as const).map(key=><mesh key={key} geometry={geometry[key]}><meshStandardMaterial color="#986b59" roughness={.9} /></mesh>)}
      </>
    </group>
    <mesh geometry={geometry.hair} castShadow><meshStandardMaterial color={yujin ? '#49352a' : '#15191b'} roughness={yujin ? .9 : .72} /></mesh>
    <mesh geometry={geometry.hairShine}><meshStandardMaterial color={yujin ? '#806149' : '#353735'} roughness={yujin ? .9 : .72} /></mesh>
    {!yujin && <mesh castShadow position={[0,1.94,-.025]} scale={[.242,.155,.184]}><sphereGeometry args={[1,40,24]} /><meshStandardMaterial color="#8d9b9d" roughness={1} /></mesh>}
    {[-1,1].map(side=><group key={side}>
      {!yujin && <mesh castShadow position={[side*.186,1.79,-.028]} scale={[.055,.12,.10]}><sphereGeometry args={[1,24,16]} /><meshStandardMaterial color="#8d9b9d" roughness={1} /></mesh>}
      <mesh position={[side*.164,1.65,-.005]} scale={[.029,.054,.024]}><sphereGeometry args={[1,20,12]} /><meshStandardMaterial color="#bd8e79" roughness={.8} /></mesh>
    </group>)}
    {([-1, 1] as const).map((side, i) => <group key={`limbs:${side}`}>
      <group ref={node => { legs.current[i] = node; }} position={[side * .115, .83, 0]}>
        <mesh position={[-side * .115, -.83, 0]} geometry={side < 0 ? geometry.legL : geometry.legR} castShadow><meshStandardMaterial color={yujin ? '#4b483f' : '#292c30'} roughness={.95} /></mesh>
        <group ref={node => { knees.current[i] = node; }} position={[0, -.36, 0]}>
          <mesh position={[side*.005,0,0]} scale={[.084,.055,.088]} castShadow><sphereGeometry args={[1,20,12]} /><meshStandardMaterial color={yujin ? '#4b483f' : '#292c30'} roughness={.95} /></mesh>
          <mesh position={[-side * .115, -.47, 0]} geometry={side < 0 ? geometry.shinL : geometry.shinR} castShadow><meshStandardMaterial color={yujin ? '#4b483f' : '#292c30'} roughness={.95} /></mesh>
          <group ref={node => { feet.current[i] = node; }} position={[0, -.36, 0]}>
            <mesh castShadow position={[side*.012,-.045,.042]} scale={[.086,.062,.153]}><sphereGeometry args={[1,24,16]} /><meshStandardMaterial color="#262a2d" roughness={.75} /></mesh>
            <mesh position={[side*.012,-.085,.052]} scale={[.088,.016,.151]}><sphereGeometry args={[1,20,12]} /><meshStandardMaterial color="#43474a" roughness={.9} /></mesh>
          </group>
        </group>
      </group>
      <group ref={node => { arms.current[i] = node; }} position={[side * .265, 1.34, 0]} scale={yujin ? [1.12,1.32,1.12] : [1,1,1]}>
        <group position={[-side * .265, -1.34, 0]}>
          <mesh geometry={side < 0 ? geometry.sleeveL : geometry.sleeveR} castShadow><meshStandardMaterial color={yujin ? coatColor : topColor} map={yujin ? maps.fabric : null} bumpMap={yujin ? bumps.fabric : null} bumpScale={.0015} roughness={.96} /></mesh>
      <mesh position={[side*.316,.819,.055]}><cylinderGeometry args={[.060,.060,.046,20]} /><meshStandardMaterial color={yujin ? '#4d5745' : '#1b4035'} roughness={1} /></mesh>
      <group position={[side*.316,.758,.066]} rotation={[.1,0,side*.08]}>
        <mesh castShadow scale={[.038,.061,.027]}><sphereGeometry args={[1,20,12]} /><meshStandardMaterial color={yujin ? '#d0ad97' : '#c39a83'} roughness={.9} /></mesh>
        {[0,1,2,3].map(i=><mesh key={i} castShadow position={[(i-1.5)*.015,-.042,.006]}><capsuleGeometry args={[.009,.032-(i===3?.012:0),3,8]} /><meshStandardMaterial color={yujin ? '#d0ad97' : '#c39a83'} roughness={.9} /></mesh>)}
        <mesh position={[-side*.033,-.005,.019]} rotation={[.2,0,side*-.45]}><capsuleGeometry args={[.012,.031,3,10]} /><meshStandardMaterial color={yujin ? '#d0ad97' : '#c39a83'} roughness={.9} /></mesh>
      </group>
        </group>
      </group>
    </group>)}
    {yujin && <group name="yujin-parka-and-hoodie">
      <mesh position={[0,1.432,-.005]}><cylinderGeometry args={[.063,.067,.14,24]}/><meshStandardMaterial color="#cba38f" roughness={.85}/></mesh>
      <mesh geometry={geometry.coat!} castShadow receiveShadow><meshStandardMaterial color={coatColor} map={maps.fabric} bumpMap={bumps.fabric} bumpScale={.0015} side={DoubleSide} roughness={.97}/></mesh>
      <mesh position={[0,1.345,-.06]} scale={[.145,.07,.065]}><sphereGeometry args={[1,24,14]}/><meshStandardMaterial color="#dfdfd7" roughness={1}/></mesh>
      {[-1,1].map(side => <group key={side}>
        <mesh geometry={side<0?geometry.lapelL!:geometry.lapelR!}><meshStandardMaterial color={coatColor} roughness={1} side={DoubleSide}/></mesh>
        <mesh position={[side*.245,.68,.135]} rotation={[0,side*.4,side*-.16]}><boxGeometry args={[.115,.17,.016]}/><meshStandardMaterial color="#686e60" roughness={1}/></mesh>
        <mesh position={[side*.07,1.265,.155]}><cylinderGeometry args={[.004,.004,.17,8]}/><meshStandardMaterial color="#d1d2c9" roughness={1}/></mesh>
        {[.47,.69,.93,1.11].map(y=><mesh key={y} position={[side*.175,y,.148]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.014,.014,.009,12]}/><meshStandardMaterial color="#424a3e" roughness={.7}/></mesh>)}
      </group>)}
      <mesh position={[0,1.20,.157]} scale={[.012,.017,.005]}><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color="#b8bfc1" metalness={.6} roughness={.35}/></mesh>
    </group>}
    {!yujin && <Fur />}
    {!yujin && <group position={[.137,1.20,.125]} rotation={[0,.26,0]}>
      {Array.from({length:7},(_,i)=><mesh key={i} position={[Math.cos(i*Math.PI*2/7)*.017,Math.sin(i*Math.PI*2/7)*.017,0]} rotation={[0,0,i*Math.PI*2/7]} scale={[.008,.014,.003]}><sphereGeometry args={[1,12,8]} /><meshStandardMaterial color="#e7e8df" roughness={1} /></mesh>)}
      <mesh position={[0,0,.004]}><sphereGeometry args={[.011,16,10]} /><meshStandardMaterial color="#d7b735" roughness={1} /></mesh>
      {[-1,1].map(side=><mesh key={side} position={[side*.003,.002,.014]}><sphereGeometry args={[.0013,6,4]} /><meshStandardMaterial color="#44402c" /></mesh>)}
    </group>}
  </group>;
});
