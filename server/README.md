# 공유 온라인 랭킹

게임의 정적 파일과 별도로 Cloudflare Worker + D1에 저장합니다. 핵폭탄 사용 판을 자동 제외하는 TOP 20, 브라우저별 최신 등록 기록, 서버 점수 재계산, 기존 행 갱신 기능이 있습니다. 공개 API: https://hnubs-smash-ranking.alpist2615-hnubs.workers.dev (2026-11-16 배포).

## 로컬 실행

저장소 루트에서 Node 24 이상으로 `npm run dev:ranking`과 `npm run dev`를 각각 실행합니다. 게임의 랭킹 버튼으로 등록·조회할 수 있습니다. 기록은 `work/leaderboard.sqlite`에 남으며 다른 브라우저도 같은 로컬 API에 연결하면 같은 기록을 봅니다. API는 127.0.0.1:8787로 바인딩하며 모바일 직접 연결은 이 로컬 설정의 범위 밖입니다.

## 최종 배포 시

전용 D1 hnubs-smash-ranking을 사용하며, 다른 프로젝트 DB를 공유하지 않습니다. 재배포 시 기존 DB를 유지합니다.

1. `wrangler.jsonc`에 등록된 D1 ID와 대상 계정을 확인합니다.
2. `npx wrangler d1 execute hnubs-smash-ranking --remote --file=server/schema.sql --config=server/wrangler.jsonc`
3. `npx wrangler deploy --config=server/wrangler.jsonc`
4. 게임 빌드 환경의 `VITE_LEADERBOARD_API`를 Worker HTTPS 주소로 설정한 뒤 게임을 빌드·배포합니다. GitHub Actions에서는 해당 이름의 repository variable을 설정합니다.

현재 연결 계정의 요금 정보 조회는 권한 부족(403)이어서 무료 계정 여부를 검증하지 못했습니다. 유료 플랜은 변경하지 않았으며, 이 프로젝트 전용 Worker와 D1만 생성했습니다. Workers와 D1 사용량은 각각의 계정 한도에 따릅니다.

닉네임·점수·파괴 수·진행 시간·등록 시각·익명 브라우저 ID를 저장합니다. 실행 식별자는 24시간 후 만료되고 다음 시작 때 정리됩니다. 원본 IP 대신 하루 단위 해시로 요청 횟수만 제한합니다. 브라우저 저장소 삭제 시 새 플레이어로 취급합니다. 다시 등록하면 점수가 더 낮아도 현재 점수와 닉네임으로 갱신합니다. 같은 판에서 핵폭탄을 사용하면 먼저 등록한 그 판의 기록도 삭제합니다.

서버가 공식 물체 ID와 점수를 검증하지만 브라우저의 실제 물리 진행을 증명하는 구조는 아닙니다. 변조 클라이언트에 대한 완전한 부정행위 방지는 지원하지 않습니다. 경쟁 보상이 생기면 서버 판정과 인증이 필요합니다.
