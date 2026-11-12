import { Suspense, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, TransformControls } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { Group, Vector3 } from 'three';
import type { OrbitControls as OrbitImpl } from 'three-stdlib';
import type { Item, V3 } from '../src/data/types';
import type { Placement } from '../src/data/layout';
import { DEFAULT_ITEMS, WORLD, specs } from '../src/data/room';
import { model } from '../src/scene/models';
import { PartMesh } from '../src/scene/PartMesh';
import { Studios } from '../src/scene/Studios';
import { Room } from '../src/scene/Room';
import { Lighting } from '../src/scene/Lighting';
import { GRAPHICS } from '../src/scene/graphics';
import { changePlacement, duplicateItems, removeItems, toLayout } from './layout-operations';
import { applyLayout } from '../src/data/layout';
import savedLayout from '../src/data/layout.json';
import { clearLocalLayout, readLocalLayout, writeLocalLayout } from '../src/data/localLayout';
import './layout-editor.css';

function EditorCamera({ view }: { view: number }) {
  const { camera, size } = useThree(), controls = useRef<OrbitImpl>(null);
  useEffect(() => {
    const fit = Math.max(32, WORLD.depth / (2 * Math.tan(Math.PI / 9) * size.width / size.height) * 1.15);
    camera.position.set(...(view % 2 ? [11 * fit / 21, 13 * fit / 21, WORLD.centerZ + 14 * fit / 21] : [0, fit, WORLD.centerZ + .1]) as V3);
    controls.current?.target.set(0, .2, WORLD.centerZ); camera.lookAt(new Vector3(0, .2, WORLD.centerZ)); controls.current?.update();
  }, [camera, view, size.width, size.height]);
  return <OrbitControls ref={controls} makeDefault minDistance={5} maxDistance={90} maxPolarAngle={Math.PI / 2.1} enableDamping />;
}
function Objects({ items, selected, mode, select, commit, report }: { items: Item[]; selected: string; mode: 'translate' | 'rotate'; select: (id: string) => void; commit: (patch: Partial<Placement>) => void; report: (message: string) => void }) {
  const refs = useRef(new Map<string, Group>());
  const dragging = useRef(false);
  function sync(values: Item[]) {
    for (const item of values) { const object = refs.current.get(item.id); if (object) { object.position.set(...item.pos); object.rotation.y = item.rotation ?? 0; object.scale.setScalar(item.scale ?? 1); } }
  }
  function placement() { const object = refs.current.get(selected); return object ? { pos: object.position.toArray() as V3, rotation: object.rotation.y, scale: object.scale.x } : null; }
  function preview() {
    if (!dragging.current) return;
    const patch = placement(); if (!patch) return;
    try { sync(changePlacement(items, selected, patch)); }
    catch { /* 드래그 중 미리 보기는 허용하고 놓을 때 방 경계를 검사한다. */ }
  }
  function finish() {
    if (!dragging.current) return;
    const patch = placement(); if (!patch) return;
    try { changePlacement(items, selected, patch); commit(patch); }
    catch (error) { sync(items); report(error instanceof Error ? error.message : '위치를 확인해 주세요.'); }
    finally { setTimeout(() => { dragging.current = false; }, 0); }
  }
  return <>
    {/* 벽·문·벽 부착물(고정 물체)은 보이기만 하고 편집하지 않는다. 천장 조명은 위에서 보는 시야를 가려 뺀다. */}
    {items.filter(item => item.fixed && item.kind !== 'light').map(item => <group key={item.id} position={item.pos} rotation={[0, item.rotation ?? 0, 0]} scale={item.scale ?? 1}>
      {model(item).map((part, i) => <PartMesh key={i} part={part} />)}
    </group>)}
    {items.filter(item => !item.fixed).map(item => <group key={item.id} ref={object => { if (object) refs.current.set(item.id, object); else refs.current.delete(item.id); }} position={item.pos} rotation={[0, item.rotation ?? 0, 0]} scale={item.scale ?? 1}
      onClick={event => { event.stopPropagation(); if (!dragging.current && event.delta < 5) select(item.id); }}>
      {model(item).map((part, i) => <PartMesh key={i} part={part} />)}
    </group>)}
    {selected && refs.current.get(selected) && <TransformControls object={refs.current.get(selected)!} mode={mode} showX={mode === 'translate'} showY={mode === 'rotate'} showZ={mode === 'translate'} size={.9} translationSnap={.05} rotationSnap={Math.PI / 12} onMouseDown={() => { dragging.current = true; }} onObjectChange={preview} onMouseUp={finish} />}
  </>;
}
function Editor() {
  const [items, setItems] = useState<Item[]>([]), [selected, setSelected] = useState(''), [mode, setMode] = useState<'translate' | 'rotate'>('translate');
  const [past, setPast] = useState<Item[][]>([]), [view, setView] = useState(0), [dirty, setDirty] = useState(false), [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('가구를 클릭하거나 목록에서 선택하세요.'), [error, setError] = useState('');
  const copied = useRef(''), [serverless, setServerless] = useState(false);
  // 제작용 서버(npm run editor)가 있으면 프로젝트 파일에 저장, 없으면(/edit 공개 페이지) 이 브라우저에 저장한다.
  useEffect(() => {
    const offline = () => { setServerless(true); setItems(applyLayout(DEFAULT_ITEMS, readLocalLayout() ?? savedLayout)); };
    fetch('/__layout', { cache: 'no-store' }).then(async response => {
      if (!response.headers.get('content-type')?.includes('json')) { offline(); return; }
      const data = await response.json(); if (!response.ok) throw new Error(data.error); setItems(data.items);
    }).catch(offline);
  }, []);
  const current = items.find(item => item.id === selected);
  function replace(next: Item[]) { setPast(previous => [...previous.slice(-19), items]); setItems(next); setDirty(true); setError(''); }
  function edit(patch: Partial<Placement>) {
    if (!current) return;
    try { replace(changePlacement(items, current.id, patch)); }
    catch (error) { setError(error instanceof Error ? error.message : '위치를 확인해 주세요.'); }
  }
  function move(x: number, z: number) { if (current) edit({ pos: [current.pos[0] + x, current.pos[1], current.pos[2] + z] }); }
  function duplicate(id = selected) {
    try { const next = duplicateItems(items, id); replace(next.items); setSelected(next.selected); setMessage('가구를 복사했습니다. 원하는 위치로 옮겨 주세요.'); }
    catch (error) { setError(error instanceof Error ? error.message : '복사하지 못했습니다.'); }
  }
  function remove() { if (current) { replace(removeItems(items, selected)); setSelected(''); } }
  function undo() { const previous = past[past.length - 1]; if (previous) { setItems(previous); setPast(p => p.slice(0, -1)); setDirty(true); setError(''); } }
  useEffect(() => {
    function key(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || saving) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c' && selected) { event.preventDefault(); copied.current = selected; setMessage('복사했습니다. Ctrl+V로 붙여넣으세요.'); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v' && copied.current) { event.preventDefault(); duplicate(copied.current); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); undo(); }
      if (event.key === 'Delete' && selected) { event.preventDefault(); remove(); }
    }
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [items, selected, past, saving]);
  function exportLayout() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(toLayout(items), null, 2) + '\n'], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'layout.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function saveLocal() {
    if (!writeLocalLayout(toLayout(items))) throw new Error('이 브라우저에 저장할 수 없습니다.');
    setDirty(false); setMessage('이 브라우저의 게임에 반영했습니다! 모두에게 반영하려면 layout.json을 내보내 주세요.');
  }
  async function save() {
    setSaving(true); setError(''); setMessage('게임에 배치를 반영하는 중입니다…');
    try {
      if (serverless) { saveLocal(); return; }
      const response = await fetch('/__layout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toLayout(items)) });
      if (!response.headers.get('content-type')?.includes('json')) { setServerless(true); saveLocal(); return; }
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setDirty(false); setMessage('반영 완료! 새로 게임을 열면 수정한 배치를 사용합니다.');
    } catch (error) { setError(error instanceof Error ? error.message : '저장에 실패했습니다.'); setMessage('편집 내용은 이 화면에 유지되어 있습니다.'); }
    finally { setSaving(false); }
  }
  return <main className="editor-shell" style={{ pointerEvents: saving ? 'none' : undefined }}>
    <aside className="editor-panel">
      <header><h1>HNUBS <span>배치 편집기</span></h1><p>{serverless ? '이 브라우저에 저장 · layout.json 내보내기' : '제작자 전용 · 이 컴퓨터의 프로젝트에 저장'}</p></header>
      <p className="intro">가구 선택 → 화살표로 이동 → 게임에 반영<br/>책상 위 기기와 소품도 함께 움직입니다.</p>
      <label className="field-label">선택한 가구<select aria-label="편집할 가구" value={selected} onChange={event => setSelected(event.target.value)}><option value="">가구를 선택하세요</option>{items.filter(item => !item.fixed).map(item => <option key={item.id} value={item.id}>{item.snackCounter ? '간식대' : specs[item.kind].label} · {item.id}</option>)}</select></label>
      <div className="editor-modes"><button aria-pressed={mode === 'translate'} onClick={() => setMode('translate')}>이동</button><button aria-pressed={mode === 'rotate'} onClick={() => setMode('rotate')}>회전</button><button onClick={() => setView(v => v + 1)}>{view % 2 ? '위에서 보기' : '입체 보기'}</button></div>
      <div className="history-buttons object-actions"><button disabled={!current || saving} onClick={() => duplicate()}>복사</button><button disabled={!current || saving} onClick={remove}>삭제</button></div>
      {current ? <section className="placement-fields">
        <h2>{current.snackCounter ? '간식대' : specs[current.kind].label}</h2>
        <div className="position-fields">{[['X 위치', 0], ['높이', 1], ['Z 위치', 2]].map(([label, index]) => <label key={label}>{label}<input key={`${current.id}:${current.pos[Number(index)]}`} aria-label={String(label)} type="number" step="0.1" defaultValue={Number(current.pos[Number(index)].toFixed(3))} onBlur={event => { const pos = [...current.pos] as V3; pos[Number(index)] = event.target.value === '' ? NaN : Number(event.target.value); if (pos[Number(index)] !== current.pos[Number(index)]) edit({ pos }); }} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} /></label>)}</div>
        <div className="move-buttons"><button onClick={() => move(0, -.1)}>위로 10cm</button><button onClick={() => move(-.1, 0)}>왼쪽 10cm</button><button onClick={() => move(.1, 0)}>오른쪽 10cm</button><button onClick={() => move(0, .1)}>아래로 10cm</button></div>
        <div className="adjust-row"><button onClick={() => edit({ rotation: (current.rotation ?? 0) - Math.PI / 12 })}>회전 −15°</button><output aria-label="회전 각도">{Math.round((current.rotation ?? 0) * 180 / Math.PI)}°</output><button onClick={() => edit({ rotation: (current.rotation ?? 0) + Math.PI / 12 })}>회전 +15°</button></div>
        <div className="adjust-row"><button onClick={() => edit({ scale: Math.max(.2, (current.scale ?? 1) - .1) })}>크기 −</button><output aria-label="가구 크기">{Math.round((current.scale ?? 1) * 100)}%</output><button onClick={() => edit({ scale: Math.min(3, (current.scale ?? 1) + .1) })}>크기 +</button></div>
      </section> : <div className="selection-empty">수납장·책상·소파 등을 직접 클릭해 보세요.<br/>물리와 공격은 이 화면에서 작동하지 않습니다.</div>}
      <div className="history-buttons"><button disabled={!past.length || saving} onClick={undo}>되돌리기</button><button disabled={saving} onClick={() => replace(DEFAULT_ITEMS)}>처음 배치</button></div>
      <div className="editor-status"><p role="status">{message}</p>{error && <p role="alert" className="editor-error">{error}</p>}<span>{dirty ? '아직 게임에 반영하지 않은 변경이 있습니다.' : '저장된 배치'}</span></div>
      <button className="save-layout" disabled={saving || !items.length} onClick={save}>{saving ? '저장 · 게임 빌드 중…' : '게임에 반영'}</button>
      <button className="export-layout" disabled={!items.length} onClick={exportLayout}>layout.json 내보내기</button>
      {serverless && readLocalLayout() !== null && <button className="export-layout" onClick={() => { clearLocalLayout(); setItems(applyLayout(DEFAULT_ITEMS, savedLayout)); setMessage('이 브라우저 저장을 지우고 기본 배치로 돌렸습니다.'); }}>브라우저 저장 지우기</button>}
      <a href={serverless ? '../' : 'http://localhost:4173/'} target="_blank" rel="noopener noreferrer">수정한 게임 열기</a>
      <p className="editor-note">Ctrl+C / V 복사·붙여넣기 · Delete 삭제<br/>Ctrl+Z 되돌리기 · 휠 확대<br/>반영 전 배치는 자동으로 백업됩니다.</p>
    </aside>
    <div className="editor-stage">
      {items.length > 0 && <Canvas shadows dpr={GRAPHICS.high.dpr} camera={{ position: [0, 21, .01], fov: 40, near: .1, far: 150 }} gl={{ antialias: true, powerPreference: 'high-performance' }} onContextMenu={event => event.preventDefault()}>
        <color attach="background" args={['#dfe2e4']} /><Lighting />
        <Suspense fallback={null}><Physics paused colliders={false}><Room /><Studios /></Physics><Objects items={items} selected={selected} mode={mode} select={setSelected} commit={edit} report={setError}/></Suspense>
        <EditorCamera view={view}/>
      </Canvas>}
      <div className="canvas-note">{current ? `${specs[current.kind].label} 선택 중 · 이동/회전 손잡이를 드래그하세요` : '도면과 같은 방향 · 왼쪽 벽 수납장 / 아래쪽 벽 스크린'}</div>
    </div>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Editor/>);
