import {useEffect,useState} from 'react';
import {useGame} from '../game/store';
import {nuclearFrame} from '../data/nuclear';
import type {MeteorStrike} from '../data/meteor';
import {CutIn,ImpactFlash,SpeedLines} from './UltimateFx';
function Sequence({strike}:{strike:MeteorStrike}) {
 const [now,setNow]=useState(performance.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(performance.now()),100);return()=>clearInterval(timer);},[]);
 const age=(now-strike.born)/1000,frame=nuclearFrame(age,strike.point);
 const title=frame.phase==='cloud'?'충격파 확산':'방송국 전역 폭발';
 return <div className={`nuclear-cinematic${strike.impacted?' is-impact':''}`} aria-label="핵폭탄 연출">
  {!strike.impacted&&<div className="ult-alarm"/>}
  {!strike.impacted&&age>2&&<SpeedLines color="#ffcf6b"/>}
  {age<1.8&&<CutIn kicker="TACTICAL NUKE · INCOMING" title="핵폭탄" color="#ffc34d"/>}
  {strike.impacted&&<ImpactFlash color="#ffb347" long/>}
  <div className="meteor-letterbox top"/><div className="meteor-letterbox bottom"/>
  <span className="sr-only" role="status">{strike.impacted?'핵폭탄이 폭발했습니다.':'핵폭탄이 투하되고 있습니다.'}</span>
  {strike.impacted&&<div className="nuclear-caption"><small>HNUBS · TOTAL DESTRUCTION</small><strong>{title}</strong><b>충격파가 방송국 전체로 확산됩니다</b></div>}
 </div>;
}
export function NuclearCinematic(){const strike=useGame(s=>s.nuke);return strike?<Sequence key={strike.id} strike={strike}/>:null;}
