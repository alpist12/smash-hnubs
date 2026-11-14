import type { Item, Part, V3, Finish } from '../data/types';

const box = (name: string, pos: V3, size: V3, finish: Finish = 'black', color?: string, round = .025): Part => ({ name, pos, size, finish, color, round });
const cylinder = (name: string, pos: V3, size: V3, finish: Finish = 'metal', color?: string): Part => ({ name, pos, size, finish, color, shape: 'cylinder' });

// Named local-space parts can be replaced by meshes from a Blender GLB without changing physics or scoring.
export function model(item: Item): Part[] {
  const w = item.widthScale ?? 1;
  // 편집기의 너비 배율: 부품의 가로(X) 위치·크기만 늘려 충돌체와 파괴 조각도 같이 따라온다.
  // ponytail: 기울어진 부품(rotation)·다각형(poly) 단면은 X로만 늘려 근사한다. 어색하면 부품별 회전을 고려해 늘릴 것.
  return w === 1 ? scaledModel(item) : scaledModel(item).map(part => ({ ...part, pos: [part.pos[0] * w, part.pos[1], part.pos[2]] as V3, size: [part.size[0] * w, part.size[1], part.size[2]] as V3 }));
}

function scaledModel(item: Item): Part[] {
  const parts = modelParts(item);
  const widths: Partial<Record<Item['kind'], number>> = { monitor: .95, mixer: 1.05, chair: .48, sledChair: .52, foldingChair: .43 };
  const baseWidth = widths[item.kind];
  if (!baseWidth || !item.width) return parts;
  const factor = item.width / baseWidth;
  return parts.map(part => ({ ...part,
    pos: part.pos.map(n => n * factor) as V3,
    size: part.size.map(n => n * factor) as V3,
    round: part.round === undefined ? undefined : part.round * factor,
  }));
}

function modelParts(item: Item): Part[] {
  const w = item.width ?? 1.55;
  switch (item.kind) {
    case 'mirror': {
      const width = item.width ?? .85, height = item.height ?? 1.4;
      const parts = [box('거울 유리', [0, 0, .012], [width - .065, height - .065, .018], 'glass', '#d6e0e0', .002), box('거울 뒷판', [0, 0, -.008], [width, height, .025], 'black', '#535c60', .008)];
      for (const x of [-width / 2 + .018, width / 2 - .018]) parts.push(box('거울 세로 테두리', [x, 0, .018], [.036, height, .045], 'metal', '#b8bdb9', .006));
      for (const y of [-height / 2 + .018, height / 2 - .018]) parts.push(box('거울 가로 테두리', [0, y, .018], [width, .036, .045], 'metal', '#b8bdb9', .006));
      return parts;
    }
    case 'desk': case 'table': {
      const low = item.kind === 'table' && item.color === '#342c29';
      const h = low ? .43 : .76, d = item.depth ?? (item.kind === 'desk' ? .72 : low ? .65 : 1);
      if (item.broadcastDesk) {
        const parts = [box('검은 작업대 테두리', [0, .75, 0], [w, .09, d], 'black', '#332e2c'), box('주황색 작업대 상판', [0, .792, -.015], [w - .035, .012, d - .065], 'wood', item.color ?? '#c1652d', .012)];
        for (const x of [-w / 2 + .08, w / 2 - .08]) parts.push(box('작업대 측판', [x, .37, 0], [.075, .74, d - .08], 'black', '#36302c'));
        parts.push(box('작업대 뒷판', [0, .49, -d / 2 + .06], [w - .16, .44, .055], 'black', '#403630'));
        parts.push(cylinder('케이블 통과구', [w / 2 - .18, .8, -d / 2 + .18], [.075, .008, .075], 'black'));
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
      // 아나부스 데스크: 가운데 일자 + 양쪽 날개 3칸. 날개는 아나운서 쪽으로 꺾여 감싼다. 유리 상판, 가로 홈, 넓은 받침.
      const parts: Part[] = [], depth = item.depth ?? .62, seg = w / 3, bend = .38;
      const sections: { x: number; z: number; rotation: V3 }[] = [
        { x: 0, z: 0, rotation: [0, 0, 0] },
        ...[-1, 1].map(side => ({ x: side * (seg / 2 + Math.cos(bend) * seg / 2), z: Math.sin(bend) * seg / 2, rotation: [0, -side * bend, 0] as V3 })),
      ];
      for (const { x, z, rotation } of sections) {
        parts.push({ ...box('데스크 몸체', [x, .4, z - .05], [seg + .02, .64, depth - .14], 'white', '#cfcab6', .012), rotation });
        for (const y of [.22, .4, .58]) parts.push({ ...box('데스크 가로 홈', [x, y, z + (depth - .14) / 2 - .04], [seg, .018, .012], 'metal', '#9d9a8c', 0), rotation, collider: false });
        parts.push({ ...box('회색 상판', [x, .745, z], [seg + .03, .03, depth + .1], 'white', '#bdbdb6', .008), rotation });
        parts.push({ ...box('유리 상판', [x, .772, z], [seg + .03, .014, depth + .12], 'glass', '#cfe1df', .004), rotation, collider: false });
        parts.push({ ...box('데스크 받침', [x, .035, z - .02], [seg + .03, .07, depth + .35], 'white', '#c4c1b2', .01), rotation });
      }
      return parts;
    }
    case 'metalCabinet': {
      // 속이 빈 철제 캐비닛: 옆판·뒤판·천판·바닥 + 가운데 선반. 안에 카메라·마이크 등이 들어 있다(contents.ts).
      const h = item.height ?? 1.3, width = item.width ?? .7, d = .6, c = '#cfcbbc', inner = '#b9b5a7';
      const parts = [
        box('캐비닛 왼쪽 판', [-width / 2 + .0125, h / 2, 0], [.025, h, d], 'white', c, .006), box('캐비닛 오른쪽 판', [width / 2 - .0125, h / 2, 0], [.025, h, d], 'white', c, .006),
        box('캐비닛 뒤판', [0, h / 2, -d / 2 + .0125], [width - .05, h, .025], 'white', inner, .004), box('캐비닛 천판', [0, h - .0125, 0], [width, .025, d], 'white', c, .006),
        box('캐비닛 바닥판', [0, .075, 0], [width - .05, .025, d - .03], 'white', inner, .004), box('캐비닛 가운데 선반', [0, h * .5, -.01], [width - .05, .02, d - .06], 'white', inner, .004),
        box('캐비닛 문', [0, h / 2 + .02, d / 2 + .01], [width - .03, h - .1, .02], 'white', '#d8d4c6', .006), box('캐비닛 손잡이', [width / 2 - .11, h / 2, d / 2 + .03], [.03, .1, .025], 'metal', '#8a8f8f'), box('캐비닛 받침', [0, .03, 0], [width + .02, .06, d + .02], 'black', '#4d4f4c', .005),
      ];
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
    case 'wallSegment': {
      // 메인룸 벽 한 구간: 하단 원목 → 하늘색 흡음 띠 → 상단 원목. bottom>0이면 문 위 상인방.
      const b = item.bottom ?? 0, h = (item.height ?? 2.8) - b;
      if (item.acoustic) {
        // 부스 벽: 흰 줄눈이 들어간 파란 회색 흡음 패널(그림), 아래 원목 걸레받이.
        const key = `acoustic:${w.toFixed(3)}:${h.toFixed(3)}:${b.toFixed(2)}`, sides = item.acoustic === 'both' ? [1, -1] : [1];
        const parts: Part[] = [box('부스 벽체', [0, b + h / 2, 0], [w, h, .1], 'white', '#e7ecef', .003)];
        for (const side of sides) {
          parts.push({ ...box('흡음 패널 면', [0, b + h / 2, side * .056], [w - .004, h - .004, .012], 'fabric', '#8697aa', 0), texture: key, rotation: side < 0 ? [0, Math.PI, 0] : undefined });
          if (b === 0) parts.push(box('원목 걸레받이', [0, .06, side * .072], [w, .12, .025], 'wood', '#bfa77f', .003));
        }
        if (item.jambs) {
          for (const x of [-w / 2 - .03, w / 2 + .03]) parts.push({ ...box('문틀', [x, 1.05, 0], [.07, 2.1, .18], 'wood', '#cdb791', .004), collider: false });
          parts.push(box('문틀 위', [0, 2.1, 0], [w + .13, .07, .18], 'wood', '#cdb791', .004));
        }
        return parts;
      }
      const parts: Part[] = [box('벽체', [0, b + h / 2, 0], [w, h, .1], 'white', '#c9bda6', .004)];
      const panels = (y: number, height: number, pitch: number, finish: Finish, color: string, name: string) => {
        const n = Math.max(1, Math.round(w / pitch));
        for (let i = 0; i < n; i++) parts.push(box(name, [-w / 2 + (i + .5) * w / n, y, .065], [w / n - .012, height, .03], finish, color, .004));
      };
      if (b === 0) {
        panels(.51, 1.0, .6, 'wood', '#d2bc98', '하단 원목 패널'); panels(1.5, .86, .9, 'fabric', '#a5b4c6', '하늘색 흡음 패널'); panels(2.37, .82, .9, 'wood', '#d8c4a3', '상단 원목 패널');
        for (const y of [1.05, 1.95]) parts.push(box('원목 몰딩', [0, y, .085], [w, .05, .05], 'wood', '#b89f7c', .004));
        parts.push(box('걸레받이', [0, .06, .085], [w, .1, .05], 'wood', '#a18e78', .004), box('천장 몰딩', [0, 2.76, .07], [w, .08, .06], 'white', '#bdbeb5', .004));
      } else panels(b + h / 2, h - .02, .9, 'wood', '#d8c4a3', '문 위 원목 패널');
      if (item.jambs) {
        for (const x of [-w / 2 - .03, w / 2 + .03]) parts.push({ ...box('문틀', [x, 1.08, .02], [.07, 2.16, .16], 'wood', '#cdb791', .004), collider: false });
        parts.push(box('문틀 위', [0, 2.16, .02], [w + .13, .07, .16], 'wood', '#cdb791', .004));
      }
      if (item.studioFace) parts.push(box('부스 쪽 흡음 마감', [0, b + h / 2, -.06], [w, h, .02], 'fabric', '#8697aa', .004));
      return parts;
    }
    case 'windowWall': {
      // 복도 쪽 창: 아래 원목 벽, 회색 창턱, 알루미늄 창틀, 유리, 반쯤 내린 크림색 롤블라인드.
      const parts: Part[] = [box('창 아래 벽체', [0, .525, 0], [w, 1.05, .1], 'white', '#c9bda6', .004), box('창 위 벽체', [0, 2.71, 0], [w, .18, .1], 'white', '#c9bda6', .004)];
      const n = Math.max(1, Math.round(w / .6));
      for (let i = 0; i < n; i++) parts.push(box('하단 원목 패널', [-w / 2 + (i + .5) * w / n, .51, .065], [w / n - .012, 1.0, .03], 'wood', '#d2bc98', .004));
      parts.push(box('화강석 창턱', [0, 1.08, .1], [w, .05, .32], 'metal', '#8c908f', .006), box('걸레받이', [0, .06, .085], [w, .1, .05], 'wood', '#a18e78', .004));
      for (const y of [1.13, 2.6]) parts.push(box('창틀 가로', [0, y, .02], [w, .06, .07], 'metal', '#b5b9b1', .004));
      for (const x of [-w / 2 + .03, 0, w / 2 - .03]) parts.push(box('창틀 세로', [x, 1.87, .02], [x ? .06 : .04, 1.44, .07], 'metal', '#b5b9b1', .004));
      parts.push(box('창 유리', [0, 1.87, 0], [w - .1, 1.42, .015], 'glass', '#9fb7bd', .002));
      parts.push(box('롤블라인드', [0, 2.24, .06], [w - .14, .7, .015], 'fabric', '#e6e0d1', .003), box('블라인드 케이스', [0, 2.58, .07], [w - .08, .06, .07], 'white', '#ecebe4', .01));
      return parts;
    }
    case 'door': {
      // 경첩이 원점, 문짝은 +x 방향. leather: 주황 가죽 누빔 방음문(양면), 아니면 원목 문.
      const parts: Part[] = [box('문짝', [.49, 1.05, 0], [.98, 2.08, .06], item.leather ? 'white' : 'wood', item.leather ? '#a7a49b' : '#d6c3a0', .008)];
      if (item.leather) for (const side of [-1, 1]) {
        parts.push(box('가죽 누빔 판', [.49, 1.1, side * .036], [.6, 1.62, .02], 'leather', '#b8752f', .02));
        for (const [row, y] of [.5, .82, 1.14, 1.46, 1.78].entries()) for (const x of row % 2 ? [.39, .59] : [.31, .49, .67]) parts.push({ ...cylinder('누빔 단추', [x, y, side * .05], [.026, .01, .026], 'metal', '#cfcfca'), rotation: [Math.PI / 2, 0, 0], collider: false });
      } else parts.push(box('문 아래 띠', [.49, .12, .032], [.9, .16, .006], 'wood', '#c4b08c', .002));
      for (const side of [-1, 1]) parts.push(box('문 손잡이', [.86, 1.02, side * .05], [.13, .025, .035], 'metal', '#b7bbb9', .008));
      return parts;
    }
    case 'whiteboard': return [box('알루미늄 테두리', [0, 0, 0], [1.45, 1.02, .04], 'metal', '#b9bcba', .008), { ...box('화이트보드 면', [0, 0, .022], [1.38, .95, .008], 'white', '#ffffff', 0), texture: item.texture ?? 'rules' }, box('펜 받침', [0, -.53, .04], [1.2, .025, .06], 'metal', '#a5a9a7', .004)];
    case 'chalkboard': return [box('칠판 테두리', [0, 0, 0], [1.62, 1.04, .05], 'metal', '#b9bdba', .008), { ...box('초록 칠판 면', [0, 0, .028], [1.54, .96, .008], 'black', '#2f3b36', 0), texture: 'chalk' }, box('분필 받침', [0, -.55, .05], [1.5, .03, .07], 'metal', '#a9aeab', .004)];
    case 'projectorScreen': return [box('스크린 검은 테두리', [0, 0, .01], [2, 1.3, .025], 'black', '#343b41', .004), box('흰색 스크린 면', [0, 0, .026], [1.94, 1.28, .008], 'white', '#e2e5dc', 0), box('흰색 롤스크린 케이스', [0, .69, .025], [2.14, .06, .075], 'white', '#e3e6dc', .015), box('스크린 하단 봉', [0, -.66, .035], [2.06, .025, .035], 'metal', '#b2b7ad', .006)];
    case 'wallClock': return [{ ...cylinder('시계 테두리', [0, 0, 0], [.4, .04, .4], 'black', '#2b3036'), rotation: [Math.PI / 2, 0, 0] }, { ...cylinder('시계 판', [0, 0, .022], [.36, .01, .36], 'white', '#f2f1ec'), rotation: [Math.PI / 2, 0, 0], texture: 'clock' }];
    case 'wireBoard': return [box('철망 메모판', [0, 0, 0], [.62, .62, .012], 'metal', '#e9ebea', .004), ...[-.2, 0, .2].map(x => ({ ...box('붙여 둔 종이', [x, -.02, .012], [.16, .22, .004], 'paper', '#f2f1ec', 0), collider: false })), box('금연 표지', [-.27, -.46, .006], [.26, .1, .006], 'paper', '#f3f2ee', 0), { ...box('금연 표시', [-.35, -.46, .011], [.06, .06, .003], 'paper', '#c8352f', 0), collider: false }];
    case 'poster': return [box('포스터 종이', [0, 0, 0], [.42, .6, .006], 'paper', '#d8c9a4', 0), { ...box('포스터 그림', [0, .04, .005], [.34, .38, .003], 'paper', '#7e6aa8', 0), collider: false }];
    case 'glassPane': {
      const width = item.width ?? 3, h = item.height ?? 1.1;
      const parts: Part[] = [-.035, .035].map(z => box('관찰창 이중 유리', [0, 0, z], [width, h, .012], 'glass', '#a9c2c6', .002));
      if (item.jambs) for (const side of [-1, 1]) {
        parts.push(box('원목 창틀', [side * (width / 2 + .07), 0, 0], [.16, h + .3, .22], 'wood', '#cdb791', .006));
        parts.push(box('원목 창틀', [0, side * (h / 2 + .07), 0], [width + .3, .16, .22], 'wood', '#cdb791', .006));
      }
      return parts;
    }
    case 'waterPurifier': {
      // 흰색 스탠드형 정수기: 위쪽 검은 조작부(파란 표시등), 출수구, 물받이, 아래 수납장.
      const parts: Part[] = [box('정수기 몸체', [0, .62, -.02], [.34, 1.24, .42], 'white', '#eceeed', .04), box('조작 패널', [0, 1.1, .195], [.28, .16, .012], 'black', '#24282b', .01)];
      for (const [i, color] of ['#5aa9e6', '#e65a5a', '#d8dcdc'].entries()) parts.push({ ...cylinder('출수 버튼', [-.08 + i * .08, 1.1, .204], [.04, .008, .04], 'paper', color), rotation: [Math.PI / 2, 0, 0], collider: false });
      parts.push({ ...box('표시등', [0, 1.155, .203], [.12, .015, .004], 'screen', '#7cc6ff', 0), collider: false });
      parts.push(box('출수 공간', [0, .86, .14], [.24, .3, .14], 'black', '#3a3f43', .02), box('출수구', [0, .99, .17], [.05, .04, .06], 'metal', '#c9cdcd'), box('물받이', [0, .73, .19], [.24, .03, .1], 'metal', '#9aa0a1'));
      parts.push(box('아래 수납장 문', [0, .34, .2], [.3, .5, .012], 'white', '#e2e5e4', .008), box('문 손잡이', [.11, .45, .21], [.02, .1, .02], 'metal', '#b5b9b9'));
      parts.push(box('위에 놓인 종이컵', [.09, 1.29, -.05], [.07, .1, .07], 'paper', '#f1eee6', .02));
      return parts;
    }
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
