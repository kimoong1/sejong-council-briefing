# 세종 의정브리핑 0.3

[공개 화면](https://kimoong1.github.io/sejong-council-briefing/) · [수집·배포 상태](https://github.com/kimoong1/sejong-council-briefing/actions/workflows/publish.yml) · [고도화 계획](docs/ROADMAP.md) · [운영 안내](docs/OPERATIONS.md)

세종특별자치시의회 공개자료에서 **질의 → 집행부 답변 → 다음 확인**을 이어 주는 오픈소스 시제품입니다. 의회가 제작·승인·운영하는 공식 서비스가 아닙니다.

## 사용 방법

1. ‘최신 공개자료’에서 수집 시각과 출처 상태를 확인합니다.
2. 회의록을 열어 실제 질의·답변 발췌와 근거가 붙은 검토용 질의를 살펴봅니다.
3. 질문을 보관하거나 원문 링크와 함께 복사·내려받기·인쇄합니다.
4. ‘의원 참고자료함’에서 자료명·키워드·종류·날짜로 찾고 참고함에 담습니다.

보관함과 개인 메모는 해당 브라우저 안에만 저장됩니다. GitHub나 다른 방문자에게 전송하지 않습니다. 임시회의록의 정식본 전환이나 본문 수정으로 원문 지문이 바뀌면 기존 질의를 재검토 대상으로 표시합니다.

## 수집 범위

2026-10-20 최초 공개 준비 시 공식 출처 7곳에서 목록 146건을 확인했습니다. 최신 회의록 본문 8건, 인접 질의·답변 발췌 24쌍, 10월 14일 행정복지위원회 감사에 대한 검토 질의 9개를 수록했습니다. 2025년의 5개 쟁점·15개 질의는 ‘이전 브리핑 예시’로 구분합니다. 이후 수집 시각과 수량은 공개 화면 및 Actions 실행 결과에서 확인하세요.

| 공식 출처 | 수집 내용 |
| --- | --- |
| [최근 회의록](https://council.sejong.go.kr/cms/mntsLatelyList.do) | 임시·정식 목록, 최신 본문, 인접 질의·답변 발췌 |
| [처리의안](https://council.sejong.go.kr/mnu/act/billList.do) | 의안명·번호·원문 링크 |
| [회의록 부록](https://council.sejong.go.kr/cms/mntsApndxList.do) | 검토보고서·예산·결산 등의 제목과 첨부 링크 |
| [감사 게시판](https://council.sejong.go.kr/mnu/cap/administrativeAffairsAuditingList.do) | 계획·조치결과 등 공개 게시물. 게시판 명칭만으로 완료 판정하지 않음 |
| [입법예고](https://council.sejong.go.kr/mnu/noc/lawNoticeList.do) | 조례안 관련 목록과 링크 |
| [연구결과](https://council.sejong.go.kr/mnu/act/researchReportList.do) | 정책연구 결과보고서 목록과 링크 |
| [보도자료](https://council.sejong.go.kr/mnu/noc/reportDataList.do) | 쟁점 탐색용 보조자료 |

출처별 최신 목록 1페이지, 최신 회의록 본문 최대 8건과 목록 밖 임시본 최대 4건을 재확인합니다. 전수·전기간 수집이 아닙니다. 첨부 HWP/PDF 본문과 실제 후속 이행 증빙은 미분석·미확인입니다. 공개 실시간 속기 원문 피드/API는 미확인입니다.

## 매일 오후 6시 최신화

GitHub Actions가 매일 **18:00 Asia/Seoul**에 수집을 요청하고 신규·수정 자료 및 수집 상태를 `web/intake.json`에 커밋한 뒤 공개 화면을 배포합니다. 별도 개인 토큰이나 유료 AI 키가 필요하지 않습니다. 정각 완료 보장은 아니며, 장기간 비활동으로 예약이 중지될 수 있습니다. [운영 안내](docs/OPERATIONS.md)를 확인하세요.

부분 실패 시 정상 자료를 보존하고 출처 실패를 표시하며 Actions는 실패로 보고합니다. 실패를 ‘새 자료 없음’으로 표시하지 않습니다. 회의일, 목록 날짜, 처음 수집한 시각을 구분합니다.

**공개 예약이 자동 갱신하는 것은 자료 색인·원문 지문·실제 발언 발췌입니다. 새로운 심층 AI 질의는 자동 생성하지 않습니다.** 검토된 질의는 `web/curated.json`에 저장하며 원문 지문이 다르면 현행 질의로 표시하지 않습니다. 소유자 비공개 Site의 별도 예약은 원문 근거를 검증한 AI 브리핑을 저장하지만, 그 결과가 GitHub에 자동 복제되지는 않습니다.

## 내 컴퓨터에서 실행

Node.js 24 이상만 필요합니다. 외부 패키지 설치 없이 실행합니다.

```sh
node --test tests/*.test.mjs
node scripts/collect.mjs web/intake.json
node scripts/prepare-public.mjs
node scripts/serve-public.mjs
```

브라우저에서 `http://127.0.0.1:4321`을 엽니다. `npm run build:public`도 읽기 전용 배포 파일을 만듭니다. 결과 `_public/`에는 브라우저용 파일만 포함됩니다.

## 소스 구조

- `web/`: 화면·공개 색인·검토 질의
- `lib/collector.mjs`: 공식 출처·파서·변경 감지
- `scripts/collect.mjs`: 수집 및 원자적 색인 저장
- `scripts/prepare-public.mjs`: 읽기 전용 공개 빌드
- `worker/server.mjs`: 소유자 비공개 Site용 저장·수집 API 참고 구현
- `tests/`: 중복·부분 실패·임시본 정정·공개 배포 경계 검사

Worker는 비공개 플랫폼의 접근 제어를 전제로 합니다. 공개 Worker로 그대로 배포하지 마세요. 공개 저장소에는 개인 메모·전체 원문 캐시·프로젝트 식별 파일·자격증명·기존 비공개 Git 이력을 포함하지 않습니다. 다른 의회로 확장할 때는 공식 출처·HTML 구조·이용 조건을 별도로 검증하세요.

오류 제보와 기여는 [기여 안내](CONTRIBUTING.md)를 따릅니다. 새로 작성한 코드는 [MIT](LICENSE)입니다. 공식 회의록·첨부자료·의회 CI는 별도 권리이며 MIT에 포함되지 않습니다. 원자료 및 CI의 별도 오픈라이선스는 미확인입니다. [NOTICE](NOTICE.txt)와 [자료 정책](docs/SOURCE_POLICY.md)을 확인하세요.

참고 사이트 `seoul-raphael.github.io/assembly-minutes/`의 소스코드·자산은 복사하지 않았습니다. 출처 판본, 질의 근거, 답변과 참고자료를 연결하는 방향으로 새로 구현했습니다.
