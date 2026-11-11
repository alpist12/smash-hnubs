import { Component, lazy, Suspense, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Hud } from './ui/Hud';
import './styles.css';
const GameScene = lazy(() => import('./scene/GameScene'));
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="error-screen"><h1>3D 화면을 열지 못했습니다</h1><p>WebGL을 지원하는 브라우저에서 하드웨어 가속을 켠 뒤 다시 시도해 주세요.</p><button onClick={() => location.reload()}>다시 불러오기</button></div> : this.props.children; }
}
createRoot(document.getElementById('root')!).render(<ErrorBoundary><main className="game"><Suspense fallback={null}><GameScene /></Suspense><Hud /></main></ErrorBoundary>);
