import { Html } from '@react-three/drei';
import { STUDIOS } from '../data/studios';

// 레퍼런스처럼 공간 위에 떠 있는 검은 이름표 (바닥 글씨 대신).
const AREAS = [{ label: '메인룸', pos: [-1.2, 3.25, 1.2] as const }, ...STUDIOS.map(s => ({ label: s.label, pos: [-1.2, 3.25, s.centerZ] as const }))];
export function AreaLabels() {
  return <>{AREAS.map(area => <Html key={area.label} position={[...area.pos]} zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}><div className="area-label">{area.label}</div></Html>)}</>;
}
