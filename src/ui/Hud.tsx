import { QUALITY_LABELS, type GraphicsMode } from '../scene/graphics';
import { useEffect, useRef, useState } from 'react';
import { useGame } from '../game/store';
import { CHARACTERS } from '../data/characters';
import { TOTAL } from '../data/room';
import { WEAPONS, type WeaponId } from '../weapons/config';
import { Splash } from './Splash';
import { UpdateNotice } from './UpdateNotice';
import { MeteorCinematic } from './MeteorCinematic';
import { Icon } from './Icon';
import { cameraInput } from '../scene/cameraInput';

function Count({ value }: { value: number }) {
  const [shown, setShown] = useState(value), current = useRef(value);
  useEffect(() => {
    let frame: number;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { current.current = value; setShown(value); return; }
    const tick = () => { current.current += (value - current.current) * .19; if (Math.abs(current.current - value) < 1) current.current = value; setShown(Math.round(current.current)); if (current.current !== value) frame = requestAnimationFrame(tick); };
    tick(); return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{shown.toLocaleString('ko-KR').padStart(5, '0')}</>;
}
export function Hud() {
  const weapon = useGame(s => s.weapon), score = useGame(s => s.score), best = useGame(s => s.best);
  const destroyed = useGame(s => s.destroyed), ready = useGame(s => s.ready), hovered = useGame(s => s.hovered);
  const cameraMode = useGame(s => s.cameraMode);
  const quality = useGame(s => s.quality), graphicsMode = useGame(s => s.graphicsMode);
  const sound = useGame(s => s.sound);
  const cinematic = useGame(s => !!s.meteor);
  const hint = useGame(s => s.hint), [help, setHelp] = useState(false), [restoring, setRestoring] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const count = Object.keys(destroyed).length, percent = Math.round(count / TOTAL * 100);
  function camera(mode: 'home' | 'top' | 'photo' | 'technical' | 'announcer' | 'character') { useGame.setState(s => ({ cameraMode: mode, cameraRequest: s.cameraRequest + 1 })); }
  function restore() { setRestoring(true); requestAnimationFrame(() => requestAnimationFrame(() => { useGame.getState().reset(); setTimeout(() => setRestoring(false), 250); })); }
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.altKey || e.metaKey || e.ctrlKey) return;
      const selected = Object.values(WEAPONS).find(w => w.key === e.key);
      if (selected) useGame.getState().select(selected.id);
      if (e.key.toLowerCase() === 'r') restore();
      if (e.key.toLowerCase() === 'f') camera('home');
      if (e.key === 'Escape') setHelp(false);
      if (e.key === '?') setHelp(h => !h);
    }
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, []);
  useEffect(() => { if (!hint) return; const id = setTimeout(() => useGame.setState({ hint: '' }), 2600); return () => clearTimeout(id); }, [hint]);
  useEffect(() => {
    if (!help) return;
    const previous = document.activeElement as HTMLElement | null;
    function trap(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const buttons = document.querySelectorAll<HTMLButtonElement>('.help-modal button');
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
    window.addEventListener('keydown', trap);
    return () => { window.removeEventListener('keydown', trap); previous?.focus(); };
  }, [help]);
  const actions = [
    { icon: 'reset', name: '시점 초기화', short: '시점', action: () => camera('home') },
    { icon: 'fit', name: '전체 방송국 보기', short: '전체', action: () => camera('top') },
    { icon: 'camera', name: '스크린 쪽 보기', short: '스크린', action: () => camera('photo') },
    { icon: 'restore', name: '맵 복구', short: '전부 복구', action: restore },
    { icon: sound ? 'sound' : 'mute', name: sound ? '사운드 끄기' : '사운드 켜기', short: '사운드', pressed: sound, action: () => useGame.setState({ sound: !sound }) },
  ];
  return <div className={`hud${cinematic ? ' is-cinematic' : ''}`}>
    <header className="topbar">
      <div className="brand-row">
        <div className="brand pill"><h1>HNUBS <span>SMASH</span></h1></div>
        <label className="room-navigation pill"><Icon name="home" size={15}/><span className="sr-only">공간 보기</span><select aria-label="공간 보기" value={cameraMode === 'photo' ? 'home' : cameraMode} onChange={e => camera(e.target.value as 'home' | 'top' | 'technical' | 'announcer' | 'character')}><option value="home">메인룸</option><option value="technical">기술부스</option><option value="announcer">아나부스</option>{CHARACTERS.map(profile => <option key={profile.id} value={profile.camera}>{profile.name}</option>)}<option value="top">방송국 전체</option></select></label>
      </div>
      <label className="graphics-control pill"><span>화질</span><select aria-label="그래픽 품질" value={graphicsMode} onChange={e => useGame.getState().selectGraphics(e.target.value as GraphicsMode)}><option value="auto">자동 · {QUALITY_LABELS[quality]}</option><option value="low">저사양 · 속도 우선</option><option value="medium">균형</option><option value="high">고화질 · 화질 우선</option></select></label>
    </header>
    <section className="scoreboard" aria-label="게임 점수">
      <div className="score-box"><span>SCORE</span><strong data-testid="score" data-score={score}><Count value={score}/></strong></div>
      <div className="score-meta pill">
        <div>최고 <b data-testid="best">{best.toLocaleString('ko-KR')}</b></div>
        <div>파괴율 <b className="hot" data-testid="destruction">{percent}%</b> <small>{count} / {TOTAL}</small></div>
        <div className="progress" aria-hidden="true"><i style={{ width: `${percent}%` }}/></div>
      </div>
    </section>
    {hovered && !cinematic && <div className="hover-label" role="status">{hovered}</div>}
    <div className="camera-pad" aria-label="카메라 조작">{([['zoomIn', '확대', 'zoom', 1], ['zoomOut', '축소', 'zoom', -1], ['rotateLeft', '왼쪽으로 돌리기', 'rotate', -1], ['rotateRight', '오른쪽으로 돌리기', 'rotate', 1]] as const).map(([icon, name, key, value]) => <button key={icon} aria-label={name} title={`${name} (누르고 있기)`}
      onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); cameraInput[key] = value; }} onPointerUp={() => { cameraInput[key] = 0; }} onPointerCancel={() => { cameraInput[key] = 0; }} onLostPointerCapture={() => { cameraInput[key] = 0; }}><Icon name={icon} size={18}/></button>)}</div>
    <footer>
      <p className="weapon-description" key={weapon}>{WEAPONS[weapon].description}</p>
      <div className="toolbar">
        <div className="weapon-bar" role="group" aria-label="무기 선택">{Object.values(WEAPONS).map(w => <button key={w.id} aria-pressed={weapon === w.id} aria-label={w.label} onClick={() => useGame.getState().select(w.id as WeaponId)}><kbd>{w.key}</kbd>{w.id === 'meteor' && <em className="badge">NEW</em>}<Icon name={w.id} size={26}/><span>{w.short}</span></button>)}</div>
        <div className="toolbar-divider" aria-hidden="true"/>
        <div className="action-bar" aria-label="카메라 및 게임 설정">{actions.map(tool => <button key={tool.name} title={tool.name} aria-label={tool.name} aria-pressed={tool.pressed} onClick={tool.action}><Icon name={tool.icon} size={20}/><span>{tool.short}</span></button>)}
          <button title="조작 도움말" aria-label="조작 도움말" onClick={() => setHelp(true)}><Icon name="help" size={20}/><span>조작법</span></button>
        </div>
      </div>
      <p className="credits">HNUBS 방송국 실내 사진 기반 재구성 · 드래그 회전 · 휠 확대 · WASD 시점 회전 · 우클릭 이동 · 바닥 더블클릭 이동</p>
    </footer>
    <MeteorCinematic />
    {hint && <div className="toast" role="status">{hint}</div>}
    <Splash ready={ready} restoring={restoring} onFinished={setSplashDone} />
    <UpdateNotice active={splashDone && ready && !restoring && !help} />
    {help && <div className="modal-backdrop" onClick={() => setHelp(false)}><section className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={e => e.stopPropagation()}>
      <button autoFocus className="close" aria-label="도움말 닫기" onClick={() => setHelp(false)}><Icon name="close"/></button><h2 id="help-title">방송국 부수기</h2><p>물체를 클릭하거나 터치해 공격하세요.<br/>큰 가구는 여러 번 타격하면 부품으로 분리됩니다.</p>
      <p>원재 선배 캐릭터를 연속 타격하면 녹음이 순서대로 나옵니다. 대사가 끝난 뒤 다음 타격으로 진행하며, 2초 동안 쉬면 처음부터 시작합니다.</p>
      <p>화질의 자동 모드는 실제 프레임 속도를 보고 해상도·그림자·반사·파편을 조절합니다. 저사양·균형·고화질을 직접 선택하면 그 설정을 유지하며, 이 브라우저에 저장합니다.</p>
      <dl><dt>카메라 회전</dt><dd>마우스 드래그 / 한 손가락</dd><dt>확대·이동</dt><dd>휠·우클릭 / 두 손가락</dd><dt>화면 버튼</dt><dd>오른쪽 ＋/− 확대 · ⟲/⟳ 회전 (누르고 있기)</dd><dt>바닥 더블클릭</dt><dd>그 위치로 카메라 이동</dd><dt>키보드 시점</dt><dd>W/S 상하 시점 · A/D 좌우 회전 · 방향키 이동 · Shift 빠르게</dd><dt>무기 선택</dt><dd>1 배트 · 2 폭탄 · 3 레이저 · 4 음파 · 5 미사일 · 6 운석</dd><dt>지속 레이저</dt><dd>물체를 누른 채로 조준</dd><dt>빠른 복구 / 시점</dt><dd>R / F</dd></dl>
      <p className="note">사진의 가구 형태와 제공된 평면도를 기준으로 재구성했습니다. 실측 치수와 미표기 수납장 위치는 추정값입니다. 기술부스·아나부스는 실내 사진을 보고 배치했습니다.</p>
      <button className="primary" onClick={() => setHelp(false)}>이제 부숴볼까요</button>
    </section></div>}
  </div>;
}
