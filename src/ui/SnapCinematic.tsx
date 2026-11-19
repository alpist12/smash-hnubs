import { useEffect, useState } from 'react';
import { useGame } from '../game/store';
import snap from '../weapons/snap';
import type { SnapStrike } from '../data/snap';
import { CutIn, ImpactFlash } from './UltimateFx';
function Sequence({ strike }: { strike: SnapStrike }) {
  const [now, setNow] = useState(performance.now()); useEffect(() => { const timer = setInterval(() => setNow(performance.now()), 100); return () => clearInterval(timer); }, []);
  const age = (now - strike.born) / 1000;
  return <div className="rayquaza-cinematic snap-cinematic" aria-label="타노스 기술 연출">
    {age >= snap.rise - .2 && age < snap.rise + 1.7 && <CutIn kicker="INFINITY SNAP" title="핑거스냅" color={snap.color} />}
    {strike.flashed && <ImpactFlash color="#fff6de" long />}
    <div className="meteor-letterbox top" /><div className="meteor-letterbox bottom" />
    <span className="sr-only" role="status">{strike.fired ? '방송국의 절반이 가루가 되어 사라집니다' : age < snap.rise ? '타노스가 나타났습니다' : '타노스가 손가락을 들어 올립니다'}</span>
  </div>;
}
export function SnapCinematic() { const strike = useGame(s => s.snap); return strike ? <Sequence key={strike.id} strike={strike} /> : null; }
