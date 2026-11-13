import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

export function Splash({ ready, restoring, onFinished }: { ready: boolean; restoring: boolean; onFinished?: (finished: boolean) => void }) {
  const [played, setPlayed] = useState(false), [leaving, setLeaving] = useState(false), [finished, setFinished] = useState(false);
  const [reduced] = useState(() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const timer = setTimeout(() => setPlayed(true), reduced ? 0 : 2100);
    return () => clearTimeout(timer);
  }, [reduced]);
  useEffect(() => {
    if (!ready || !played) { setLeaving(false); return; }
    setLeaving(true);
    const timer = setTimeout(() => setFinished(true), reduced ? 0 : 450);
    return () => clearTimeout(timer);
  }, [ready, played, reduced]);
  useEffect(() => { if (finished) onFinished?.(true); }, [finished, onFinished]);
  if (finished) return !ready || restoring ? <div className="loading" role="status"><div className="loading-mark"/><strong>방송국 복구 중</strong><span>공간과 물체를 원래대로 돌립니다</span></div> : null;
  return <div className={`onair-splash${leaving ? ' is-leaving' : ''}`} role="status" aria-live="polite" aria-label="HNUBS ON AIR 시작 화면">
    <p className="onair-station">국립한밭대학교 방송국</p>
    <div className="onair-sign" aria-label="ON AIR">
      <i className="onair-pilot" aria-hidden="true" />
      <span className="onair-word onair-word-on">ON</span><span className="onair-word onair-word-air">AIR</span>
    </div>
    <div className="onair-signal" aria-hidden="true">{[.35, .65, 1, .8, .5, .7, .4].map((height, i) => <i key={i} style={{ '--level': height, '--delay': `${i * .09}s` } as CSSProperties} />)}</div>
    <strong className="onair-game">HNUBS <span>SMASH</span></strong>
    <p className="onair-caption">{ready ? '방송을 시작합니다' : '방송 준비 중'}</p>
  </div>;
}
