import { CanvasTexture, SRGBColorSpace } from 'three';

// 벽에 붙은 물건의 그림(캔버스 텍스처). 파편에도 같은 그림이 남는다.
const RULES = ['방송 20분 전 와서 준비하기', '자신의 행동에 책임지기', '외부인 출입금지', '통화 에티켓 지키기', '상호존중하기', '청소 잘하기', '남의 물건 함부로 건드리지 않기', '문단속 잘하기', '냉장고 이름 적어서 넣기', '기술부스·아나부스 음식물 반입금지'];
const cache = new Map<string, CanvasTexture>();
function canvas(w: number, h: number) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')!] as const; }
function draw(key: string) {
  if (key.startsWith('acoustic:')) {
    // 부스 흡음벽: 파란 회색 패브릭 + 흰 줄눈(가로 0.75m, 세로 0.6m). key = acoustic:폭:높이:바닥높이
    const [w, h, bottom] = key.split(':').slice(1).map(Number), px = 128;
    const [c, ctx] = canvas(Math.max(8, Math.round(w * px)), Math.max(8, Math.round(h * px)));
    ctx.fillStyle = '#8697aa'; ctx.fillRect(0, 0, c.width, c.height);
    let seed = Math.round(w * 1000 + h * 7); const r = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < c.width * c.height / 30; i++) { ctx.fillStyle = r() > .5 ? 'rgba(60,72,90,.22)' : 'rgba(200,212,224,.18)'; ctx.fillRect(r() * c.width, r() * c.height, 2, 1); }
    ctx.fillStyle = '#e7ecef';
    for (let x = 0; x <= w + .001; x += .75) ctx.fillRect(Math.round(x * px) - 2, 0, 4, c.height);
    const top = bottom + h;
    for (let y = Math.ceil(bottom / .6) * .6; y <= top + .001; y += .6) ctx.fillRect(0, Math.round((top - y) * px) - 2, c.width, 4);
    return c;
  }
  if (key === 'rules') {
    const [c, ctx] = canvas(512, 360); ctx.fillStyle = '#f4f4f0'; ctx.fillRect(0, 0, 512, 360);
    ctx.fillStyle = '#2c3540'; ctx.font = '30px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('HNUBS 규칙', 256, 42); ctx.textAlign = 'left';
    ctx.font = '17px sans-serif'; RULES.forEach((line, i) => { ctx.fillStyle = '#323b46'; ctx.fillText(`${i + 1}. ${line}`, 40, 78 + i * 28); });
    return c;
  }
  if (key === 'calendar') {
    const [c, ctx] = canvas(512, 360); ctx.fillStyle = '#f4f4f0'; ctx.fillRect(0, 0, 512, 360);
    ctx.fillStyle = '#5b9bd5'; ctx.fillRect(20, 14, 26, 26); ctx.fillStyle = '#36424a'; ctx.font = 'bold 24px sans-serif'; ctx.fillText('월중행사 및 계획표', 150, 36);
    const colors = ['#e88a9a', '#9a7fc4', '#7fa7c9', '#8cc49c', '#e6c36c', '#d99a6c', '#7fbfbf'];
    for (let d = 0; d < 7; d++) { ctx.fillStyle = colors[d]; ctx.fillRect(20 + d * 68, 52, 64, 14); }
    ctx.strokeStyle = '#b8bcbd'; ctx.lineWidth = 1.5;
    for (let r = 0; r < 5; r++) for (let d = 0; d < 7; d++) {
      ctx.strokeRect(20 + d * 68, 70 + r * 52, 64, 50); ctx.fillStyle = '#4a5358'; ctx.font = '12px sans-serif'; ctx.fillText(String(r * 7 + d + 1), 24 + d * 68, 84 + r * 52);
      if ((r * 7 + d) % 4 === 1) { ctx.fillStyle = ['#d24a4a', '#2e7d4f', '#2f5fae'][(r + d) % 3]; ctx.fillRect(26 + d * 68, 92 + r * 52, 40, 3); ctx.fillRect(26 + d * 68, 100 + r * 52, 28, 3); }
    }
    return c;
  }
  if (key === 'chalk') {
    const [c, ctx] = canvas(512, 330); ctx.fillStyle = '#2f3b36'; ctx.fillRect(0, 0, 512, 330);
    let seed = 11; const r = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 2500; i++) { ctx.fillStyle = `rgba(220,230,220,${r() * .05})`; ctx.fillRect(r() * 512, r() * 330, 3, 2); }
    for (let i = 0; i < 26; i++) { const x = 230 + (i % 9) * 30, y = 18 + Math.floor(i / 9) * 46; ctx.fillStyle = '#ecebe4'; ctx.fillRect(x, y, 24, 40); ctx.fillStyle = ['#59606a', '#8a8f96', '#3e4349'][i % 3]; for (let k = 0; k < 4; k++) ctx.fillRect(x + 3, y + 3 + k * 9, 18, 7); }
    for (let i = 0; i < 9; i++) { const x = 18 + (i % 3) * 34, y = 120 + Math.floor(i / 3) * 52; ctx.fillStyle = '#eeede6'; ctx.fillRect(x, y, 28, 44); ctx.fillStyle = '#7d828a'; ctx.fillRect(x + 3, y + 3, 22, 30); }
    ctx.fillStyle = '#f2efe6'; ctx.font = 'bold 30px sans-serif'; ctx.fillText('HNUBS', 30, 52); ctx.font = '19px sans-serif'; ctx.fillStyle = '#f4b9c8'; ctx.fillText('끌어치기 ✿', 40, 88);
    ctx.fillStyle = '#d9ecf2'; ctx.font = '26px sans-serif'; ctx.fillText('25년 방송국 화이팅', 250, 290);
    ctx.strokeStyle = '#e8e6dc'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(140, 140 + i * 30); ctx.lineTo(215, 135 + i * 30); ctx.stroke(); }
    return c;
  }
  // clock
  const [c, ctx] = canvas(256, 256); ctx.fillStyle = '#f2f1ec'; ctx.beginPath(); ctx.arc(128, 128, 125, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2b3036'; ctx.font = '26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let n = 1; n <= 12; n++) { const a = n * Math.PI / 6; ctx.fillText(String(n), 128 + Math.sin(a) * 96, 128 - Math.cos(a) * 96); }
  ctx.strokeStyle = '#2b3036'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(128, 128); ctx.lineTo(168, 77); ctx.moveTo(128, 128); ctx.lineTo(207, 129); ctx.stroke();
  return c;
}
export function wallTexture(key: string) {
  if (!cache.has(key)) { const t = new CanvasTexture(draw(key)); t.colorSpace = SRGBColorSpace; t.anisotropy = 4; cache.set(key, t); }
  return cache.get(key)!;
}
