import type { Item, Part, V3, Finish } from './types';

/**
 * 수납장·상자 안에 들어 있는 방송 장비. 평소엔 안쪽 선반에 놓여 보이고,
 * 수납장이 부서지면 실제 물리 물체로 쏟아져 나온다.
 */
const box = (name: string, pos: V3, size: V3, finish: Finish = 'black', color?: string, round = .01): Part => ({ name, pos, size, finish, color, round, collider: false });
const cyl = (name: string, pos: V3, size: V3, finish: Finish = 'black', color?: string, rotation?: V3): Part => ({ name, pos, size, finish, color, shape: 'cylinder', rotation, collider: false });
const Z: V3 = [Math.PI / 2, 0, 0];

/** 소품 모델 (바닥 중심이 원점, +z가 앞). */
export const PROPS = {
  engCamera: (): Part[] => [ // 어깨에 메는 ENG 카메라
    box('ENG 카메라 몸체', [0, .12, 0], [.13, .2, .36], 'black', '#26292c', .02),
    cyl('ENG 줌 렌즈', [0, .13, .27], [.1, .2, .1], 'black', '#1b1d1f', Z),
    cyl('렌즈 앞 유리', [0, .13, .375], [.085, .01, .085], 'glass', '#3d5866', Z),
    box('렌즈 후드', [0, .13, .39], [.13, .1, .03], 'black', '#202224'),
    box('상단 손잡이', [0, .25, .02], [.035, .03, .26], 'black', '#303336'),
    cyl('뷰파인더', [-.09, .22, .12], [.045, .14, .045], 'black', '#2c2f31', Z),
    box('배터리 팩', [0, .12, -.21], [.11, .14, .06], 'white', '#9aa0a2', .01),
    cyl('샷건 마이크', [.05, .27, .2], [.022, .2, .022], 'metal', '#565c60', Z),
    box('방송국 스티커', [.067, .14, 0], [.004, .05, .1], 'paper', '#d9672b', 0),
  ],
  camcorder: (): Part[] => [ // 핸디캠
    box('캠코더 몸체', [0, .055, 0], [.085, .1, .19], 'black', '#2b2e31', .02),
    cyl('캠코더 렌즈', [0, .065, .11], [.055, .06, .055], 'black', '#1d1f21', Z),
    cyl('렌즈 유리', [0, .065, .142], [.045, .006, .045], 'glass', '#3d5866', Z),
    box('접이식 LCD', [-.05, .07, .02], [.01, .06, .08], 'screen', '#8fa4ad', .004),
    box('손잡이 스트랩', [.048, .05, -.01], [.012, .05, .12], 'leather', '#1b1c1e', .005),
  ],
  handMic: (): Part[] => [ // 핸드 마이크 (누워 있음)
    cyl('핸드마이크 손잡이', [0, .025, -.04], [.04, .17, .04], 'black', '#1f2224', Z),
    cyl('마이크 그릴', [0, .03, .07], [.055, .06, .055], 'metal', '#a9b0b2', Z),
    box('방송사 큐브', [0, .03, .02], [.06, .05, .05], 'white', '#e7e3d6', .008),
  ],
  wirelessMic: (): Part[] => [
    box('무선 수신기', [0, .025, 0], [.2, .045, .15], 'black', '#2e3236', .006),
    box('수신기 표시창', [-.04, .028, .076], [.07, .02, .004], 'screen', '#7fb2a2', 0),
    cyl('수신 안테나', [.08, .09, -.06], [.008, .13, .008], 'black', '#16181a'),
    cyl('수신 안테나', [-.08, .09, -.06], [.008, .13, .008], 'black', '#16181a'),
  ],
  headphones: (): Part[] => [
    box('헤드밴드', [0, .17, 0], [.17, .025, .04], 'black', '#1d1f21', .012),
    box('이어컵', [-.085, .07, 0], [.04, .1, .09], 'leather', '#232528', .03),
    box('이어컵', [.085, .07, 0], [.04, .1, .09], 'leather', '#232528', .03),
    box('밴드 연결부', [-.085, .14, 0], [.015, .06, .02], 'metal', '#8b9193'),
    box('밴드 연결부', [.085, .14, 0], [.015, .06, .02], 'metal', '#8b9193'),
  ],
  tapes: (): Part[] => [ // HDCAM 테이프 몇 개
    box('방송용 테이프', [0, .012, 0], [.11, .022, .17], 'black', '#24272a', .004),
    box('테이프 라벨', [0, .024, .02], [.08, .002, .08], 'paper', '#e7e2cf', 0),
    box('방송용 테이프', [.01, .036, -.005], [.11, .022, .17], 'black', '#2b2e33', .004),
    box('방송용 테이프', [-.006, .06, .004], [.11, .022, .17], 'black', '#24272a', .004),
  ],
  cable: (): Part[] => [ // XLR 케이블 뭉치
    cyl('케이블 뭉치', [0, .02, 0], [.2, .04, .2], 'black', '#181a1b'),
    cyl('케이블 구멍', [0, .041, 0], [.11, .002, .11], 'black', '#2c2f30'),
    box('XLR 커넥터', [.11, .02, .03], [.06, .022, .022], 'metal', '#9ea4a6', .006),
  ],
  battery: (): Part[] => [
    box('카메라 배터리', [0, .04, 0], [.1, .08, .06], 'white', '#a1a7a9', .01),
    box('배터리 라벨', [0, .05, .031], [.07, .03, .002], 'paper', '#e2cf4a', 0),
  ],
  ledLight: (): Part[] => [
    box('LED 조명 패널', [0, .07, 0], [.18, .13, .03], 'black', '#2b2e30', .01),
    box('LED 발광면', [0, .07, .016], [.16, .11, .004], 'white', '#fff4d6', 0),
    box('조명 슈 마운트', [0, .005, 0], [.04, .01, .04], 'metal', '#8b9193'),
  ],
  clapper: (): Part[] => [
    box('슬레이트 판', [0, .006, 0], [.25, .012, .2], 'black', '#1d1f20', .003),
    box('슬레이트 줄무늬', [0, .014, -.08], [.25, .006, .04], 'white', '#e8e6df', .002),
  ],
};
export type PropKind = keyof typeof PROPS;
export interface Content { prop: PropKind; pos: V3; rotation?: number }

export function contents(item: Item): Content[] {
  switch (item.kind) {
    case 'cabinet': return [
      { prop: 'engCamera', pos: [-.12, .055, -.02], rotation: .2 }, { prop: 'tapes', pos: [.19, .055, .02] }, { prop: 'battery', pos: [.2, .13, .02] },
      { prop: 'camcorder', pos: [-.17, 1.125, 0], rotation: -.3 }, { prop: 'handMic', pos: [.03, 1.125, .05], rotation: .5 }, { prop: 'headphones', pos: [.2, 1.125, -.03] },
    ];
    case 'wardrobe': {
      const w = item.width ?? .94;
      return [
        { prop: 'engCamera', pos: [-w * .25, .052, -.02], rotation: -.15 }, { prop: 'cable', pos: [w * .18, .052, .02] }, { prop: 'ledLight', pos: [w * .2, .1, -.15] },
        { prop: 'camcorder', pos: [-w * .3, 1.222, 0], rotation: .3 }, { prop: 'wirelessMic', pos: [0, 1.222, 0] }, { prop: 'handMic', pos: [w * .28, 1.222, .06], rotation: -.6 }, { prop: 'clapper', pos: [w * .05, 1.27, .02], rotation: .2 },
      ];
    }
    case 'metalCabinet': {
      const h = item.height ?? 1.3, w = item.width ?? .7;
      return [
        { prop: 'engCamera', pos: [-w * .15, .085, -.03], rotation: .25 }, { prop: 'battery', pos: [w * .3, .085, .05] }, { prop: 'tapes', pos: [w * .28, .085, -.12] },
        { prop: 'camcorder', pos: [-w * .25, h * .5 + .015, 0], rotation: -.4 }, { prop: 'headphones', pos: [w * .1, h * .5 + .015, -.05] }, { prop: 'handMic', pos: [w * .3, h * .5 + .015, .1], rotation: .8 },
      ];
    }
    case 'carton': {
      const width = item.width ?? .6;
      return [{ prop: 'cable', pos: [-width * .2, .02, 0] }, { prop: 'tapes', pos: [width * .22, .02, .05] }, { prop: 'handMic', pos: [width * .1, .07, -.1], rotation: 1 }];
    }
    case 'mediaCabinet': return [{ prop: 'tapes', pos: [-.3, 1.73, .05] }, { prop: 'tapes', pos: [.35, .9, .06], rotation: .4 }];
    case 'equipmentStack': return [{ prop: 'tapes', pos: [-.2, .962, .05], rotation: .3 }];
    default: return [];
  }
}
