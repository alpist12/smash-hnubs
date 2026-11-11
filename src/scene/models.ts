import type { Item, Part, V3, Finish } from '../data/types';

const box = (name: string, pos: V3, size: V3, finish: Finish = 'black', color?: string, round = .025): Part => ({ name, pos, size, finish, color, round });
const cylinder = (name: string, pos: V3, size: V3, finish: Finish = 'metal', color?: string): Part => ({ name, pos, size, finish, color, shape: 'cylinder' });

// Named local-space parts can be replaced by meshes from a Blender GLB without changing physics or scoring.
export function model(item: Item): Part[] {
  const w = item.width ?? 1.55;
  switch (item.kind) {
    case 'desk': case 'table': {
      const low = item.kind === 'table' && item.color === '#342c29';
      const h = low ? .43 : .76, d = item.depth ?? (item.kind === 'desk' ? .72 : low ? .65 : 1);
      if (item.broadcastDesk) {
        const parts = [box('검은 작업대 테두리', [0, .75, 0], [w, .09, d], 'black', '#332e2c'), box('주황색 작업대 상판', [0, .789, -.015], [w - .035, .012, d - .065], 'wood', item.color ?? '#c1652d', .012)];
        for (const x of [-w / 2 + .08, w / 2 - .08]) parts.push(box('작업대 측판', [x, .37, 0], [.075, .74, d - .08], 'black', '#36302c'));
        parts.push(box('작업대 뒷판', [0, .49, -d / 2 + .06], [w - .16, .44, .055], 'black', '#403630'));
        parts.push(cylinder('케이블 통과구', [w / 2 - .18, .812, -d / 2 + .18], [.075, .008, .075], 'black'));
        return parts;
      }
      const parts = [box('상판', [0, h, 0], [w, .065, d], item.trim ? 'white' : 'wood', item.color ?? '#d0ae65', item.trim ? .03 : .025)];
      // 사진: 흰 상판 테두리를 갈색 고무 몰딩이 감싼다.
      if (item.trim) parts.push(box('갈색 테두리 몰딩', [0, h - .005, 0], [w + .05, .05, d + .05], 'leather', item.trim, .025));
      for (const x of [-w / 2 + .09, w / 2 - .09]) for (const z of [-d / 2 + .07, d / 2 - .07]) parts.push(box('금속 다리', [x, h / 2, z], [.045, h, .045], 'metal'));
      parts.push(box('보강 프레임', [0, h - .13, d / 2 - .07], [w - .1, .075, .04], 'metal'));
      if (item.kind === 'desk') {
        parts.push(box('서랍장', [w / 2 - .23, .39, .02], [.38, .58, .58], 'wood', '#c5aa76'));
        for (const y of [.24, .43, .62]) {
          parts.push(box('서랍 앞판', [w / 2 - .23, y, .32], [.35, .16, .025], 'wood', '#cfb682'));
          parts.push(box('서랍 손잡이', [w / 2 - .23, y + .015, .345], [.11, .018, .02], 'metal'));
        }

      }
      return parts;
    }
    case 'partition': {
      const parts = [box('하부 흡음판', [0, .45, 0], [w, .7, .055], 'fabric', '#919ba3')];
      for (const y of [1.04, 1.47]) parts.push(box('회색 흡음 칸막이', [0, y, 0], [w, .42, .055], 'fabric', '#919ba3'));
      for (const x of [-w / 2, w / 2]) {
        parts.push(box('칸막이 프레임', [x, .86, 0], [.025, 1.67, .07], 'metal', '#444c51'));
        parts.push(box('칸막이 받침발', [x, .025, 0], [.075, .05, .42], 'metal', '#444c51'));
      }
      for (const y of [.09, .82, 1.26, 1.69]) parts.push(box('칸막이 가로 테두리', [0, y, 0], [w + .03, .025, .07], 'metal', '#444c51'));
      return parts;
    }
    case 'mixer': {
      const parts = [box('믹서 본체', [0, .07, 0], [1.05, .14, .62], 'metal', '#373e43'), box('컨트롤 패널', [0, .148, 0], [.99, .016, .57], 'black', '#252d32')];
      for (let i = 0; i < 12; i++) {
        const x = (i - 5.5) * .075;
        parts.push(box('페이더 레일', [x, .16, .11], [.012, .008, .23], 'metal', '#11191f'));
        parts.push(box('페이더 손잡이', [x, .173, .02 + i % 4 * .045], [.045, .025, .04], 'white', '#d3d9d5'));
        for (let row = 0; row < 3; row++) parts.push(cylinder('채널 노브', [x, .17, -.07 - row * .065], [.027, .025, .027], 'black', row === 1 ? '#638a9c' : '#8d9698'));
        parts.push(box('채널 표시등', [x, .16, -.25], [.03, .006, .025], 'screen', '#8bbb77'));
      }
      return parts;
    }
    case 'microphone': return [cylinder('마이크 받침', [0, .02, 0], [.22, .04, .22], 'black'), cylinder('스탠드 기둥', [0, .18, 0], [.024, .32, .024]), { ...cylinder('마이크 몸체', [0, .39, -.03], [.06, .2, .06], 'black'), rotation: [-.35, 0, 0] }, cylinder('금속 그릴', [0, .5, -.065], [.075, .08, .075], 'metal', '#a6afb1'), box('팝필터 지지대', [0, .35, .085], [.012, .25, .012], 'metal'), { ...cylinder('원형 팝필터', [0, .48, .085], [.17, .018, .17], 'black'), rotation: [Math.PI / 2, 0, 0] }];
    case 'speaker': return [box('스피커 캐비닛', [0, .25, 0], [.3, .5, .28], 'black', '#24292c'), { ...cylinder('우퍼', [0, .19, .148], [.2, .025, .2], 'black', '#424b50'), rotation: [Math.PI / 2, 0, 0] }, { ...cylinder('트위터', [0, .39, .148], [.085, .025, .085], 'metal'), rotation: [Math.PI / 2, 0, 0] }];
    case 'rack': {
      const h = item.height ?? 1.3, width = item.width ?? .65, depth = item.depth ?? .62, rows = Math.round(h / .155);
      const parts = [box('랙 후판', [0, h / 2, -depth / 2 + .025], [width, h, .05], 'black', '#20272c')];
      for (const x of [-width / 2, width / 2]) parts.push(box('밝은 회색 랙 측판', [x, h / 2, 0], [.04, h, depth], 'white', '#b9bdb8'));
      for (const y of [.035, h - .035]) parts.push(box('랙 상하 프레임', [0, y, 0], [width, .07, depth], 'white', '#c6c8be'));
      for (let i = 0; i < rows; i++) {
        const y = .11 + i * (h - .2) / rows;
        parts.push(box('방송 장비 전면', [0, y, depth / 2 - .045], [width - .08, .12, .07], 'black', i % 3 ? '#34383b' : '#585d5d'));
        parts.push({ ...box('상태 표시창', [-width * .2, y, depth / 2 - .005], [width * .25, .038, .008], 'screen', i === 3 ? '#6562e2' : '#8da59e'), collider: false });
        for (let n = 0; n < 5; n++) parts.push({ ...box('채널 표시등', [.02 + n * .055, y, depth / 2], [.014, .014, .009], 'paper', i % 3 ? '#c6d16e' : '#ba5350', 0), collider: false });
      }
      if (h > 1.5) {
        parts.push(box('투명 랙 유리문', [0, h / 2, depth / 2 + .035], [width - .045, h - .12, .014], 'glass', '#b2bfc0', .005));
        for (const x of [-width / 2 + .025, width / 2 - .025]) parts.push(box('유리문 프레임', [x, h / 2, depth / 2 + .05], [.035, h - .08, .03], 'black'));
        parts.push(box('랙 문 손잡이', [width / 2 - .1, h / 2, depth / 2 + .07], [.025, .2, .03], 'metal'));
      }
      return parts;
    }
    case 'mediaCabinet': {
      const h = 2.15, d = .48, color = item.color ?? '#a96e31';
      const parts = [box('CD장 뒷판', [0, h / 2, -d / 2], [w, h, .035], 'wood', color)];
      for (const x of [-w / 2, w / 2, 0]) parts.push(box('CD장 세로 칸막이', [x, h / 2, 0], [.045, h, d], 'wood', color));
      for (let row = 0; row <= 5; row++) {
        const y = .08 + row * .405;
        parts.push(box('CD장 선반', [0, y, 0], [w, .035, d], 'wood', color));
        if (row < 5) for (let n = 0; n < 14; n++) parts.push({ ...box('CD 케이스', [-w / 2 + .085 + n * (w - .17) / 14, y + .17, .055], [.035, .28 + n % 3 * .012, .22], 'paper', ['#d8d9cf', '#414b54', '#89909a', '#b8b6a5'][n % 4], .001), collider: false });
      }
      for (const sign of [-1, 1]) {
        parts.push(box('CD장 유리문', [sign * w / 4, h / 2, .255], [w / 2 - .065, h - .12, .012], 'glass', '#b3c2bf', .005));
        for (const y of [.12, 1.07, 2.09]) parts.push(box('문 가로 프레임', [sign * w / 4, y, .27], [w / 2, .065, .04], 'wood', color));
        parts.push(box('문 세로 프레임', [sign * (w / 2 - .025), h / 2, .27], [.06, h, .04], 'wood', color));
        parts.push(box('CD장 손잡이', [sign * .07, 1.15, .31], [.025, .2, .035], 'metal', '#9c9c8a'));
      }
      return parts;
    }
    case 'carton': {
      const h = item.height ?? .45, width = item.width ?? .6;
      return [box('골판지 상자', [0, h / 2, 0], [width, h, .45], 'paper', '#bba173'), box('포장 테이프', [0, h + .003, 0], [.07, .008, .45], 'paper', '#d5bd8e'), box('상자 라벨', [0, h / 2, .229], [.22, .12, .006], 'paper', '#d6c7a7', 0)];
    }
    case 'chair': {
      const parts = [box('좌판', [0, .48, 0], [.48, .12, .47], 'fabric', item.color ?? '#25282b', .09), box('곡면 등받이', [0, .8, -.2], [.46, .58, .09], 'fabric', item.color ?? '#292d30', .08), box('헤드레스트', [0, 1.13, -.21], [.28, .15, .08], 'fabric', '#24272b', .06), cylinder('유압 기둥', [0, .25, 0], [.065, .4, .065])];
      for (const x of [-.27, .27]) {
        parts.push(box('팔걸이', [x, .68, .02], [.065, .05, .32], 'black', '#282a2c'));
        parts.push(box('팔걸이 지지대', [x, .57, -.04], [.035, .2, .04], 'black'));
      }
      for (let n = 0; n < 5; n++) {
        const a = n * Math.PI * 2 / 5;
        parts.push({ ...box('오발 다리', [Math.sin(a) * .15, .09, Math.cos(a) * .15], [.035, .045, .33], 'black'), rotation: [0, a, 0] });
        parts.push(cylinder('바퀴', [Math.sin(a) * .29, .055, Math.cos(a) * .29], [.075, .075, .075], 'black'));
      }
      return parts;
    }
    case 'monitor': return [box('화면 프레임', [0, .46, 0], [.95, .55, .045], 'black', '#222429'), box('LCD 화면', [0, .46, .026], [.89, .49, .008], 'screen', '#ffffff', 0), box('후면', [0, .46, -.035], [.58, .32, .045], 'black'), box('스탠드', [0, .15, -.03], [.05, .28, .06], 'metal'), box('받침대', [0, .022, 0], [.35, .035, .24], 'black')];
    case 'laptop': return [box('키보드 본체', [0, .02, 0], [.38, .035, .27], 'black', '#363c42'), box('키보드', [0, .04, -.035], [.31, .008, .13], 'screen', '#8a9b9e', 0), { ...box('화면 덮개', [0, .165, -.13], [.38, .28, .018], 'black', '#33383e'), rotation: [-.13, 0, 0] }, { ...box('디스플레이', [0, .164, -.118], [.34, .235, .008], 'screen', '#ffffff', 0), rotation: [-.13, 0, 0] }];
    case 'sofa': {
      const color = item.color ?? '#c9c7b1';
      if (item.curved) {
        const parts: Part[] = [];
        // 사진: 크게 휘어진 테라코타 패브릭 소파, 바깥쪽 등받이, 회색 원통 다리.
        const n = 6, k = .5;
        for (let i = 0; i < n; i++) {
          const x = (i - (n - 1) / 2) * w / n, t = x / (w / 2), z = k * t * t, rotation: V3 = [0, -Math.atan(2 * k * t / (w / 2)), 0];
          const seg = w / n + .06;
          parts.push({ ...box('곡선 소파 프레임', [x, .3, z], [seg, .2, .62], 'fabric', color, .05), rotation });
          parts.push({ ...box('곡선 좌석 쿠션', [x, .45, z + .03], [seg, .14, .64], 'fabric', color, .06), rotation });
          parts.push({ ...box('곡선 등받이', [x, .66, z - .27], [seg + .01, .62, .12], 'fabric', color, .05), rotation });
          if (i % 2 === 0 || i === n - 1) for (const depth of [-.18, .2]) parts.push(cylinder('회색 소파 다리', [x, .1, z + depth], [.07, .2, .07], 'metal', '#9da3a3'));
        }
        return parts;
      }
      const parts = [box('가죽 프레임', [0, .29, 0], [w, .27, .72], 'leather', color, .085), box('등받이', [0, .67, -.29], [w, .55, .18], 'leather', color, .09)];
      for (const x of [-w / 2 + .095, w / 2 - .095]) {
        parts.push(box('팔걸이', [x, .51, .02], [.17, .39, .7], 'leather', color, .08));
        for (const z of [-.25, .25]) parts.push(cylinder('소파 다리', [x, .09, z], [.045, .18, .045], 'metal'));
      }
      const seats = Math.max(2, Math.round(w / .7));
      for (let i = 0; i < seats; i++) {
        const x = -w / 2 + .18 + (i + .5) * (w - .36) / seats;
        parts.push(box('좌석 쿠션', [x, .47, .04], [(w - .38) / seats - .014, .16, .55], 'leather', color, .065));
        parts.push(box('등 쿠션', [x, .72, -.178], [(w - .38) / seats - .014, .36, .1], 'leather', color, .05));
      }
      const depthScale = (item.depth ?? .72) / .72;
      return parts.map(p => ({ ...p, pos: [p.pos[0], p.pos[1], p.pos[2] * depthScale], size: [p.size[0], p.size[1], p.size[2] * depthScale] }));
    }
    case 'bench': {
      const depth = item.depth ?? .4;
      const parts = [box('짙은 갈색 벤치 좌판', [0, .44, 0], [w, .04, depth], 'wood', '#6a5040', .006), box('검은 벤치 프레임', [0, .375, 0], [w - .06, .09, depth - .04], 'black', '#1f2022')];
      for (const x of [-w / 2 + .06, w / 2 - .06]) for (const z of [-depth / 2 + .04, depth / 2 - .04]) parts.push(box('벤치 다리', [x, .21, z], [.05, .42, .05], 'black', '#1f2022'));
      return parts;
    }
    case 'printer': return [box('프린터 받침장', [0, .3, 0], [.61, .6, .46], 'white', '#d8d9cb'), box('받침장 문', [0, .3, .24], [.54, .52, .025], 'white', '#dfe0d3'), box('레이저 프린터 본체', [0, .77, 0], [.64, .34, .49], 'white', '#e0e2da'), box('프린터 검은 상판', [0, .96, 0], [.64, .045, .49], 'black', '#343a3c'), box('용지 배출구', [0, .75, .254], [.4, .055, .012], 'black', '#505858'), box('종이 묶음', [0, .99, .08], [.29, .025, .21], 'paper', '#f0eee1')];
    case 'stand': {
      const parts = [cylinder('삼각대 중앙봉', [0, .82, 0], [.035, 1.55, .035], 'metal', '#30373b'), box('삼각대 LED 본체', [0, 1.62, 0], [.43, .22, .065], 'black', '#303a3b'), box('LED 확산판', [0, 1.62, .037], [.39, .18, .012], 'white', '#d5dfd2')];
      for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; parts.push({ ...box('삼각대 펼친 다리', [Math.sin(a) * .13, .18, Math.cos(a) * .13], [.025, .4, .025], 'metal', '#30373b'), rotation: [Math.cos(a) * .7, 0, -Math.sin(a) * .7] }); }
      return parts;
    }
    case 'shelf': {
      const parts: Part[] = [];
      for (const x of [-.19, .19]) for (const z of [-.12, .12]) parts.push(box('선반 기둥', [x, .66, z], [.025, 1.32, .025], 'metal', '#424c50'));
      for (const y of [.12, .48, .84]) parts.push(box('선반 판', [0, y, 0], [.42, .035, .3], 'metal', '#485155'));
      parts.push(box('보관 상자', [.06, .58, 0], [.16, .17, .22], 'wood', '#be9d69'));
      parts.push(box('책 묶음', [-.09, .2, .01], [.15, .12, .21], 'paper', '#c6cdc7'));
      parts.push(box('분홍 쿠션', [.08, .99, 0], [.18, .24, .13], 'leather', '#d5a3ac', .07));
      parts.push(box('전화기', [-.12, .89, .04], [.13, .055, .12], 'white', '#d6cfab'));
      return parts;
    }
    case 'wardrobe': {
      const width = item.width ?? .94;
      const parts = [box('수납장 왼쪽 판', [-width / 2 + .02, 1.23, 0], [.04, 2.46, .56], 'wood', '#cba066'), box('수납장 오른쪽 판', [width / 2 - .02, 1.23, 0], [.04, 2.46, .56], 'wood', '#cba066'), box('수납장 뒤판', [0, 1.23, -.265], [width, 2.46, .03], 'wood', '#bc955d')];
      for (const y of [.03, 1.2, 2.44]) parts.push(box('수납장 선반', [0, y, 0], [width, .04, .56], 'wood', '#cba066'));
      for (const sign of [-1, 1]) {
        parts.push(box('긴 목재 문', [sign * width / 4, 1.23, .29], [width / 2 - .014, 2.4, .035], 'wood', '#d5ad73'));
        parts.push(box('긴 문 손잡이', [sign * .065, 1.32, .318], [.022, .18, .025], 'metal', '#d1d0bf'));
      }
      return parts;
    }
    case 'fridge': return [
      box('냉장고 몸체', [0, .66, -.03], [.61, 1.32, .5], 'white', '#ccd8c6'),
      box('냉동실 문', [0, 1.1, .245], [.6, .4, .055], 'white', '#dce3d3'),
      box('냉장실 문', [0, .435, .245], [.6, .88, .055], 'white', '#c4d2bf'),
      box('냉동실 손잡이', [.17, .94, .28], [.2, .025, .025], 'metal', '#858f85'),
      box('냉장실 손잡이', [.17, .82, .28], [.2, .025, .025], 'metal', '#858f85'),
      box('냉장고 안내 메모', [.12, 1.11, .276], [.13, .16, .004], 'paper', '#e8e6d8'),
    ];
    case 'microwave': return [
      box('전자레인지 외함', [0, .205, -.02], [.68, .39, .37], 'white', '#e4e2d8'),
      box('전자레인지 문', [-.075, .215, .18], [.49, .29, .035], 'black', '#454c4e'),
      box('문 유리', [-.075, .215, .2], [.4, .21, .008], 'glass', '#334349'),
      box('문 손잡이', [.17, .215, .22], [.025, .23, .03], 'white', '#c5c6bf'),
      cylinder('상단 조작 다이얼', [.274, .295, .198], [.065, .035, .065], 'white', '#9fa8a4'),
      cylinder('하단 조작 다이얼', [.274, .13, .198], [.065, .035, .065], 'white', '#9fa8a4'),
      box('고무 발', [0, .012, 0], [.52, .025, .25], 'black', '#41484a'),
    ];
    case 'coffee': return [
      box('커피머신 본체', [0, .28, -.025], [.36, .54, .34], 'black', '#333b3d', .045),
      box('금속 전면', [0, .33, .154], [.29, .34, .025], 'metal', '#a5adac'),
      box('원두 통', [0, .59, -.025], [.27, .12, .24], 'glass', '#61564b', .035),
      box('추출 헤드', [0, .32, .2], [.16, .075, .09], 'black', '#333a3c'),
      box('드립 받침대', [0, .065, .21], [.31, .045, .18], 'metal', '#878e8b'),
      box('작동 버튼', [.09, .46, .175], [.04, .035, .01], 'white', '#82a88e'),
    ];
    case 'snack': return [box('간식 포장', [0, .13, 0], [.16, .25, .085], 'paper', item.color ?? '#c28e44', .035), box('포장 라벨', [0, .15, .046], [.11, .09, .004], 'paper', '#e8dbbb', .005), box('봉지 밀봉', [0, .25, 0], [.17, .018, .08], 'paper', item.color ?? '#c28e44', .003)];
    case 'cabinet': {
      const parts = [box('좌측 판', [-.33, 1.13, 0], [.04, 2.26, .48], 'wood', '#d6ae6b'), box('우측 판', [.33, 1.13, 0], [.04, 2.26, .48], 'wood', '#d6ae6b'), box('후면 판', [0, 1.13, -.23], [.66, 2.26, .035], 'wood', '#b98c53')];
      for (const y of [.03, 1.1, 2.25]) parts.push(box('선반', [0, y, 0], [.68, .045, .48], 'wood', '#d0aa6b'));
      for (const y of [.56, 1.68]) {
        parts.push(box('사물함 문', [0, y, .25], [.63, 1.07, .035], 'wood', '#d8b372'));
        parts.push(box('금속 손잡이', [.21, y, .278], [.018, .11, .025], 'metal', '#c0b9a9'));
        parts.push(box('이름표', [-.09, y + .36, .272], [.16, .045, .005], 'white', '#e6e4d9', 0));
      }
      return parts;
    }
    case 'cup': return [cylinder('컵 몸체', [0, .065, 0], [.09, .13, .09], 'white', '#e6dfc5'), cylinder('커피', [0, .132, 0], [.072, .003, .072], 'black', '#47362b'), box('손잡이', [.06, .078, 0], [.045, .055, .025], 'white', '#e6dfc5')];
    case 'book': return [box('책 페이지', [0, .033, 0], [.19, .05, .27], 'paper', '#d9d8ce', .003), box('책 표지', [0, .062, 0], [.2, .008, .28], 'paper', item.color ?? '#a1b9bc', .003), box('책 등', [-.1, .033, 0], [.014, .065, .28], 'paper', item.color ?? '#a1b9bc', .003)];
    case 'keyboard': {
      const parts = [box('키보드 본체', [0, .016, 0], [.4, .028, .15], 'black', '#282a2c', .01)];
      for (let row = 0; row < 4; row++) parts.push(box('키캡 열', [0, .033, (row - 1.5) * .029], [.36, .01, .022], 'black', '#646667', .002));
      return parts;
    }
    case 'mouse': return [box('마우스', [0, .028, 0], [.065, .048, .1], 'white', '#cbd1d3', .035)];
    case 'panel': return [box('흡음판 왼쪽', [-.195, .42, 0], [.39, .84, .07], 'fabric', '#8d9ca7'), box('흡음판 오른쪽', [.195, .42, 0], [.39, .84, .07], 'fabric', '#8d9ca7')];
    case 'light': return [box('LED 평판 조명 프레임', [0, 0, 0], [1.25, .05, .32], 'white', '#c9cccc'), box('LED 확산판', [0, -.03, 0], [1.2, .014, .27], 'white', '#fff5d9')];
    case 'anchorDesk': {
      // 아나부스 사진: 아나운서 쪽으로 오목한 곡선형 베이지 데스크, 유리 상판, 가로 홈, 넓은 받침.
      const parts: Part[] = [], segments = 10, depth = item.depth ?? .62;
      for (let i = 0; i < segments; i++) {
        const x = (i - (segments - 1) / 2) * w / segments, t = x / (w / 2), z = .22 * t * t, rotation: V3 = [0, -Math.atan(.88 * t / w), 0];
        const seg = w / segments + .02;
        parts.push({ ...box('데스크 몸체', [x, .4, z - .05], [seg, .64, depth - .14], 'white', '#cfcab6', .012), rotation });
        for (const y of [.22, .4, .58]) parts.push({ ...box('데스크 가로 홈', [x, y, z + (depth - .14) / 2 - .04], [seg, .018, .012], 'metal', '#9d9a8c', 0), rotation, collider: false });
        parts.push({ ...box('회색 상판', [x, .745, z], [seg, .03, depth + .1], 'white', '#bdbdb6', .008), rotation });
        parts.push({ ...box('유리 상판', [x, .772, z], [seg, .014, depth + .12], 'glass', '#cfe1df', .004), rotation, collider: false });
        parts.push({ ...box('데스크 받침', [x, .035, z - .02], [seg, .07, depth + .35], 'white', '#c4c1b2', .01), rotation });
      }
      return parts;
    }
    case 'metalCabinet': {
      const h = item.height ?? 1.3, width = item.width ?? .7, d = .6;
      const parts = [box('철제 캐비닛 몸체', [0, h / 2, 0], [width, h, d], 'white', '#cfcbbc', .01), box('캐비닛 문', [0, h / 2 - .02, d / 2 + .01], [width - .1, h - .16, .02], 'white', '#d8d4c6', .006), box('캐비닛 손잡이', [width / 2 - .11, h / 2, d / 2 + .03], [.03, .1, .025], 'metal', '#8a8f8f'), box('캐비닛 받침', [0, .03, 0], [width + .02, .06, d + .02], 'black', '#4d4f4c', .005)];
      for (const x of [-.13, .13]) parts.push({ ...box('타공 통풍구', [x, h - .32, d / 2 + .022], [.15, .13, .004], 'black', '#3d4142', 0), collider: false });
      parts.push(box('위에 놓인 사진 액자', [-.12, h + .1, -.05], [.22, .18, .02], 'paper', '#e3e1d8', .002));
      return parts;
    }
    case 'floorSofa': {
      const width = item.width ?? 1.5;
      return [box('좌식 소파 방석', [0, .1, .05], [width, .2, .85], 'leather', '#20242b', .06), { ...box('좌식 소파 등받이', [0, .38, -.32], [width, .55, .16], 'leather', '#1d2128', .06), rotation: [-.38, 0, 0] }, box('소파 위 옷가지', [.1, .23, .05], [.55, .07, .4], 'fabric', '#e8e8e4', .03)];
    }
    case 'paSpeaker': {
      const h = item.height ?? .9, width = item.width ?? .55, d = item.depth ?? .5;
      const parts: Part[] = [box('PA 스피커 캐비닛', [0, h / 2, 0], [width, h, d], 'black', '#202326', .02), { ...cylinder('PA 우퍼', [0, h * .38, d / 2 + .005], [width * .72, .02, width * .72], 'black', '#34393d'), rotation: [Math.PI / 2, 0, 0] }, box('PA 혼 트위터', [0, h * .8, d / 2 + .005], [width * .5, h * .12, .02], 'black', '#3c4246')];
      if (h > .8) parts.push({ ...cylinder('PA 우퍼 2', [0, h * .62, d / 2 + .004], [width * .5, .02, width * .5], 'black', '#30353a'), rotation: [Math.PI / 2, 0, 0] });
      return parts;
    }
    case 'metalShelf': {
      const parts: Part[] = [];
      for (const x of [-.27, .27]) parts.push(box('선반 기둥', [x, .74, -.02], [.03, 1.48, .03], 'metal', '#2a2e31'), box('선반 앞기둥', [x, .7, .17], [.03, 1.4, .03], 'metal', '#2a2e31'));
      for (const [i, y] of [.06, .43, .8, 1.17, 1.45].entries()) {
        parts.push(box('철제 선반판', [0, y, .07], [.56, .025, .32 - i * .03], 'metal', '#34393c', .004));
        if (i < 4) parts.push(box('베개 쿠션', [0, y + .09, .07], [.46, .16, .28], 'fabric', i % 2 ? '#e8dcc6' : '#ede6d6', .06));
      }
      return parts;
    }
    case 'extinguisher': return [cylinder('소화기 몸통', [0, .25, 0], [.16, .46, .16], 'leather', '#c4322b'), cylinder('소화기 밸브', [0, .51, 0], [.06, .07, .06], 'metal', '#2e3133'), box('소화기 손잡이', [0, .56, .03], [.03, .02, .12], 'black'), box('소화기 노즐', [.07, .38, .05], [.02, .26, .02], 'black'), box('소화기 라벨', [0, .27, .081], [.11, .14, .003], 'paper', '#f0e7c8', 0)];
    case 'foldingChair': {
      const parts: Part[] = [box('접이식 의자 좌판', [0, .46, .02], [.43, .04, .42], 'leather', '#2f3236', .02), { ...box('접이식 의자 등판', [0, .8, -.2], [.42, .26, .04], 'leather', '#2f3236', .02), rotation: [-.12, 0, 0] }];
      for (const x of [-.21, .21]) {
        parts.push({ ...box('크롬 앞다리', [x, .4, .04], [.022, .82, .022], 'metal', '#c4c8ca'), rotation: [.28, 0, 0] });
        parts.push({ ...box('크롬 뒷다리', [x, .5, -.12], [.022, 1, .022], 'metal', '#c4c8ca'), rotation: [-.22, 0, 0] });
      }
      return parts;
    }
    case 'sledChair': {
      const parts: Part[] = [box('패브릭 좌판', [0, .46, .02], [.52, .09, .5], 'fabric', item.color ?? '#8f8c86', .04), { ...box('패브릭 등받이', [0, .76, -.22], [.52, .5, .08], 'fabric', item.color ?? '#8f8c86', .05), rotation: [-.15, 0, 0] }];
      for (const x of [-.29, .29]) {
        parts.push(box('크롬 썰매 다리', [x, .015, .02], [.025, .025, .6], 'metal', '#c6cacb'));
        parts.push({ ...box('크롬 앞 기둥', [x, .23, .3], [.025, .46, .025], 'metal', '#c6cacb'), rotation: [-.2, 0, 0] });
        parts.push(box('크롬 팔걸이', [x, .62, .02], [.028, .028, .5], 'metal', '#c6cacb'));
        parts.push(box('팔걸이 지지대', [x, .54, .27], [.025, .17, .025], 'metal', '#c6cacb'));
      }
      return parts;
    }
    case 'micStand': {
      // 삼각대 받침 + 세로 기둥 + 위로 뻗은 붐 암 끝의 방송 마이크.
      const parts: Part[] = [cylinder('스탠드 기둥', [0, .64, 0], [.03, 1.2, .03], 'metal', '#25282a'), cylinder('기둥 클램프', [0, 1.24, 0], [.05, .06, .05], 'black', '#1b1d1f'), { ...box('붐 암', [0, 1.3, .3], [.022, .022, .8], 'metal', '#25282a'), rotation: [-.35, 0, 0] }, { ...cylinder('방송 마이크', [0, 1.43, .7], [.055, .17, .055], 'black', '#1d2023'), rotation: [1.1, 0, 0] }, { ...cylinder('마이크 그릴', [0, 1.47, .77], [.062, .06, .062], 'metal', '#9aa1a3'), rotation: [1.1, 0, 0] }];
      for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; parts.push({ ...box('삼각 다리', [Math.sin(a) * .17, .03, Math.cos(a) * .17], [.36, .022, .022], 'metal', '#25282a'), rotation: [0, a - Math.PI / 2, 0] }); }
      return parts;
    }
    case 'ottoman': return [box('가죽 스툴', [0, .21, 0], [.45, .42, .45], 'leather', '#1f2226', .05)];
    case 'floorCushion': {
      const parts: Part[] = [];
      for (let i = 0; i < 4; i++) parts.push(box('누빔 방석 칸', [0, .06, (i - 1.5) * .45], [.55, .12, .43], 'fabric', '#5b3f31', .05));
      return parts;
    }
    case 'sideTable': {
      const parts: Part[] = [cylinder('대리석 상판', [0, .5, 0], [.6, .03, .6], 'white', '#ece9e3')];
      for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; parts.push({ ...box('원목 다리', [Math.sin(a) * .16, .25, Math.cos(a) * .16], [.03, .5, .03], 'wood', '#bfa57e'), rotation: [Math.cos(a) * .25, 0, -Math.sin(a) * .25] }); }
      return parts;
    }
    case 'ampRack': {
      const parts: Part[] = [box('앰프 본체', [0, .82, 0], [.5, .1, .42], 'black', '#212427', .01), box('앰프 전면 노브', [0, .82, .215], [.4, .04, .01], 'metal', '#9aa0a0'), cylinder('위에 놓인 테이프', [.12, .9, 0], [.09, .05, .09], 'white', '#9fc8d2')];
      for (const x of [-.22, .22]) parts.push({ ...box('X자 스탠드', [x, .38, 0], [.025, .85, .025], 'metal', '#2a2d30'), rotation: [.55, 0, 0] }, { ...box('X자 스탠드', [x, .38, 0], [.025, .85, .025], 'metal', '#2a2d30'), rotation: [-.55, 0, 0] });
      return parts;
    }
    case 'headphones': return [{ ...box('헤드밴드', [0, .17, 0], [.17, .025, .04], 'black', '#202326', .01) }, cylinder('왼쪽 이어컵', [-.08, .08, 0], [.08, .14, .08], 'black', '#26292c'), cylinder('오른쪽 이어컵', [.08, .08, 0], [.08, .14, .08], 'black', '#26292c')];
    case 'equipmentStack': {
      const parts = [box('장비장 상판', [0, .93, 0], [.78, .04, .56], 'black', '#1f2224'), box('장비장 측판', [-.37, .47, 0], [.04, .9, .56], 'black', '#1f2224'), box('장비장 측판', [.37, .47, 0], [.04, .9, .56], 'black', '#1f2224')];
      for (const [i, y] of [.15, .45, .74].entries()) {
        parts.push(box('장비장 선반', [0, y - .1, 0], [.7, .03, .54], 'black', '#26292b'));
        parts.push(box(['트라이캐스터', 'JVC VCR', '데크'][i], [0, y, .02], [.66, .14, .46], 'black', i === 0 ? '#2b2f33' : '#34383b', .01));
        parts.push({ ...box('장비 표시창', [-.15, y, .255], [.18, .035, .005], 'screen', '#9db2aa', 0), collider: false });
      }
      parts.push(box('위에 놓인 CD', [.18, .96, .05], [.14, .01, .14], 'paper', '#d8dadc'));
      return parts;
    }
  }
}
