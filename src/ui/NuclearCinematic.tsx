import {useEffect,useState} from 'react';
import {useGame} from '../game/store';
import {nuclearFrame} from '../data/nuclear';
import type {MeteorStrike} from '../data/meteor';
import {CutIn,ImpactFlash,SpeedLines} from './UltimateFx';
function Sequence({strike}:{strike:MeteorStrike}) {
 const [now,setNow]=useState(performance.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(performance.now()),100);return()=>clearInterval(timer);},[]);
 const age=(now-strike.born)/1000,frame=nuclearFrame(age,strike.point);
 const title=frame.phase==='drop'?'핵폭탄 투하 경고':frame.phase==='impact'?'방송국 전역 폭발':'충격파 확산';
 return <div className={`nuclear-cinematic${strike.impacted?' is-impact':''}`} aria-label="핵폭탄 연출">
  {!strike.impacted&&<div className="ult-alarm"/>}
  {!strike.impacted&&age>2&&<SpeedLines color="#ffcf6b"/>}
  {age<1.8&&<CutIn kicker="TACTICAL NUKE · INCOMING" title="핵폭탄" color="#ffc34d"/>}
  {strike.impacted&&<ImpactFlash color="#ffb347" long/>}
  <div className="meteor-letterbox top"/><div className="meteor-letterbox bottom"/>
  <div className="nuclear-caption" role="status"><small>HNUBS · TOTAL DESTRUCTION</small><strong>{title}</strong><b>{strike.impacted?'충격파가 방송국 전체로 확산됩니다':`${frame.remaining.toFixed(1)}초 후 충격`}</b>{!strike.impacted&&<span className="nuclear-countdown" aria-hidden="true">{Math.max(1,Math.ceil(frame.remaining))}</span>}</div>
 </div>;
}
export function NuclearCinematic(){const strike=useGame(s=>s.nuke);return strike?<Sequence key={strike.id} strike={strike}/>:null;}
