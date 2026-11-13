import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Color, DoubleSide, InstancedMesh, Object3D, Quaternion, Vector3 } from 'three';
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

export const CharacterModel=memo(function CharacterModel() {
  const geometry=useMemo(()=>({
    head:headGeometry(),hair:hairGeometry(),hairShine:hairGeometry(true),torso:torsoGeometry(),
    sleeveL:sleeveGeometry(-1),sleeveR:sleeveGeometry(1),legL:trousersGeometry(-1),legR:trousersGeometry(1),
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
  }),[]);
  useEffect(()=>()=>Object.values(geometry).forEach(g=>g.dispose()),[geometry]);
  return <group name="sculpted-character-wonjae">
    <mesh geometry={geometry.torso} castShadow receiveShadow><meshStandardMaterial color="#244b3e" roughness={.96} /></mesh>
    <mesh geometry={geometry.hem}><meshStandardMaterial color="#1c3e34" roughness={1} /></mesh>
    <mesh geometry={geometry.sleeveL} castShadow><meshStandardMaterial color="#244b3e" roughness={.96} /></mesh>
    <mesh geometry={geometry.sleeveR} castShadow><meshStandardMaterial color="#244b3e" roughness={.96} /></mesh>
    <mesh geometry={geometry.legL} castShadow><meshStandardMaterial color="#292c30" roughness={.95} /></mesh>
    <mesh geometry={geometry.legR} castShadow><meshStandardMaterial color="#292c30" roughness={.95} /></mesh>
    <mesh geometry={geometry.collarL} castShadow><meshStandardMaterial color="#e9e6dc" side={DoubleSide} roughness={.9} /></mesh>
    <mesh geometry={geometry.collarR} castShadow><meshStandardMaterial color="#e9e6dc" side={DoubleSide} roughness={.9} /></mesh>
    <mesh position={[0,1.399,0]}><cylinderGeometry args={[.071,.084,.042,28,1,true]} /><meshStandardMaterial color="#e9e6dc" side={DoubleSide} roughness={.9} /></mesh>
    <mesh position={[0,1.432,-.005]}><cylinderGeometry args={[.063,.067,.12,24]} /><meshStandardMaterial color="#ba8d78" roughness={.8} /></mesh>
    <group position={[0,CHIN_Y,0]}>
      <mesh geometry={geometry.head} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.78} /></mesh>
      {(['eyeL','eyeR','browL','browR'] as const).map(key=><mesh key={key} geometry={geometry[key]}><meshStandardMaterial color={key.startsWith('brow')?'#29231f':'#c7b9a7'} roughness={.9} /></mesh>)}
      {(['irisL','irisR','rimL','rimR'] as const).map(key=><mesh key={key} geometry={geometry[key]}><meshStandardMaterial color="#392b25" roughness={.8} /></mesh>)}
      {(['lidL','lidR','lowerL','lowerR'] as const).map(key=><mesh key={key} geometry={geometry[key]}><meshStandardMaterial color="#b78773" roughness={.85} /></mesh>)}
      <mesh geometry={geometry.mouth}><meshStandardMaterial color="#654139" roughness={.8} /></mesh>
      <mesh geometry={geometry.teeth}><meshStandardMaterial color="#dfd8c7" roughness={.6} /></mesh>
      <mesh geometry={geometry.lip}><meshStandardMaterial color="#b47c70" roughness={.8} /></mesh>
      {(['nostrilL','nostrilR'] as const).map(key=><mesh key={key} geometry={geometry[key]}><meshStandardMaterial color="#986b59" roughness={.9} /></mesh>)}
    </group>
    <mesh geometry={geometry.hair} castShadow><meshStandardMaterial color="#15191b" roughness={.72} /></mesh>
    <mesh geometry={geometry.hairShine}><meshStandardMaterial color="#353735" roughness={.72} /></mesh>
    <mesh castShadow position={[0,1.94,-.025]} scale={[.242,.155,.184]}><sphereGeometry args={[1,40,24]} /><meshStandardMaterial color="#8d9b9d" roughness={1} /></mesh>
    {[-1,1].map(side=><group key={side}>
      <mesh castShadow position={[side*.186,1.79,-.028]} scale={[.055,.12,.10]}><sphereGeometry args={[1,24,16]} /><meshStandardMaterial color="#8d9b9d" roughness={1} /></mesh>
      <mesh position={[side*.164,1.65,-.005]} scale={[.029,.054,.024]}><sphereGeometry args={[1,20,12]} /><meshStandardMaterial color="#bd8e79" roughness={.8} /></mesh>
      <mesh castShadow position={[side*.127,.065,.042]} scale={[.086,.062,.153]}><sphereGeometry args={[1,24,16]} /><meshStandardMaterial color="#262a2d" roughness={.75} /></mesh>
      <mesh position={[side*.127,.025,.052]} scale={[.088,.016,.151]}><sphereGeometry args={[1,20,12]} /><meshStandardMaterial color="#43474a" roughness={.9} /></mesh>
      <mesh position={[side*.316,.819,.055]}><cylinderGeometry args={[.060,.060,.046,20]} /><meshStandardMaterial color="#1b4035" roughness={1} /></mesh>
      <group position={[side*.316,.758,.066]} rotation={[.1,0,side*.08]}>
        <mesh castShadow scale={[.038,.061,.027]}><sphereGeometry args={[1,20,12]} /><meshStandardMaterial color="#c39a83" roughness={.8} /></mesh>
        {[0,1,2,3].map(i=><mesh key={i} castShadow position={[(i-1.5)*.015,-.042,.006]}><capsuleGeometry args={[.009,.032-(i===3?.012:0),3,8]} /><meshStandardMaterial color="#c39a83" roughness={.8} /></mesh>)}
        <mesh position={[-side*.033,-.005,.019]} rotation={[.2,0,side*-.45]}><capsuleGeometry args={[.012,.031,3,10]} /><meshStandardMaterial color="#c39a83" roughness={.8} /></mesh>
      </group>
    </group>)}
    <Fur />
    <group position={[.137,1.20,.125]} rotation={[0,.26,0]}>
      {Array.from({length:7},(_,i)=><mesh key={i} position={[Math.cos(i*Math.PI*2/7)*.017,Math.sin(i*Math.PI*2/7)*.017,0]} rotation={[0,0,i*Math.PI*2/7]} scale={[.008,.014,.003]}><sphereGeometry args={[1,12,8]} /><meshStandardMaterial color="#e7e8df" roughness={1} /></mesh>)}
      <mesh position={[0,0,.004]}><sphereGeometry args={[.011,16,10]} /><meshStandardMaterial color="#d7b735" roughness={1} /></mesh>
      {[-1,1].map(side=><mesh key={side} position={[side*.003,.002,.014]}><sphereGeometry args={[.0013,6,4]} /><meshStandardMaterial color="#44402c" /></mesh>)}
    </group>
  </group>;
});
