import {useEffect,useRef,useState} from 'react';
import {useGame} from '../game/store';
import {startRecoveryCountdown} from '../game/nuclearRecovery';
export function NuclearRecovery({onRestore}:{onRestore:()=>void}){
 const impact=useGame(s=>s.nuke?.impacted?s.nuke.id:null);
 const [event,setEvent]=useState<number|null>(null),[remaining,setRemaining]=useState(10);
 const cancel=useRef<()=>void>(()=>{});
 useEffect(()=>{if(impact!==null)setEvent(impact);},[impact]);
 useEffect(()=>{
  if(event===null)return;
  cancel.current=startRecoveryCountdown(setRemaining,()=>{setEvent(null);onRestore();});
  return ()=>cancel.current();
 },[event,onRestore]);
 function dismiss(){cancel.current();setEvent(null);}
 if(event===null)return null;
 return <section className="nuclear-recovery" aria-label="핵폭탄 후 맵 복구">
  <strong>방송국이 파괴됐습니다</strong><p role="status">10초 뒤 자동으로 리셋됩니다.</p>
  <div><button onClick={dismiss}>그대로 두기</button><button className="recovery-now" onClick={()=>{dismiss();onRestore();}}>지금 복구하기 ({remaining}초)</button></div>
 </section>;
}
