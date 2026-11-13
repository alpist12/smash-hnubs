import { useEffect, useState } from 'react';
import type { MeteorStrike } from '../data/meteor';
import { useGame } from '../game/store';
import meteor from '../weapons/meteor';
import { Icon } from './Icon';
function Sequence({ strike }: { strike: MeteorStrike }) {
  const [now,setNow]=useState(performance.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(performance.now()),100);return()=>clearInterval(timer);},[]);
  const remaining=Math.max(0,meteor.flight-(now-strike.born)/1000);
  return <div className={`meteor-cinematic${strike.impacted?' is-impact':''}`} aria-label="운석 낙하 연출">
    <span className="sr-only" role="status">{strike.impacted?'운석이 충돌했습니다.':'운석이 낙하하고 있습니다.'}</span>
    <div className="meteor-vignette"/><div className="meteor-letterbox top"/><div className="meteor-letterbox bottom"/>
    <div className="meteor-caption"><Icon name="meteor" size={26}/><div><span>{strike.impacted?'IMPACT':'METEOR INBOUND'}</span><strong>{strike.impacted?'운석 충돌':'운석 낙하'}</strong></div><b aria-hidden="true">{strike.impacted?'충돌':`${remaining.toFixed(1)}s`}</b></div>
    {!strike.impacted && <div className="meteor-track" aria-hidden="true"><i style={{transform:`scaleX(${Math.max(0,remaining/meteor.flight)})`}}/></div>}
    {strike.impacted && <div className="meteor-screen-flash"/>}
  </div>;
}
export function MeteorCinematic() { const strike=useGame(s=>s.meteor);return strike?<Sequence key={strike.id} strike={strike}/>:null; }
