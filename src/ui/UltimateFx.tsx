import type { CSSProperties } from 'react';
/** 궁극기 공통 화면 연출. 애니메이션은 CSS가 맡고, 마운트 순간 한 번 재생된다. */
const tint = (color: string) => ({ '--ult': color }) as CSSProperties;
export function CutIn({ kicker, title, color }: { kicker: string; title: string; color: string }) {
  return <div className="ult-cutin" style={tint(color)} aria-hidden="true"><div className="ult-cutin-band"><small>{kicker}</small><strong>{title}</strong></div></div>;
}
export const SpeedLines = ({ color }: { color: string }) => <div className="ult-speed" style={tint(color)} aria-hidden="true" />;
export const ImpactFlash = ({ color, long, soft }: { color: string; long?: boolean; soft?: boolean }) =>
  <div className={`ult-impact${long ? ' long' : ''}${soft ? ' soft' : ''}`} style={tint(color)} aria-hidden="true"><i /></div>;
