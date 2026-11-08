# 기술 프로필 — 희선캘린더 (cal_three)

프갤 캘린더(`dcfdg_cal`)의 쌍둥이 앱. 같은 Supabase DB를 쓰고 기능도 같지만,
일정 등록·수정·삭제는 라분다이브 캘린더처럼 **관리자 모드**에서만 가능하다.

## 앱 정체성 — `src/lib/appConfig.ts`

- `COMPANY_CODE`: 공용 테이블에서 이 앱의 일정만 골라내는 값. 프갤(`dcfdg`)·라분(`laboon01`)과 겹치면 안 됨
- `APP_NAME`, `SHARE_LABEL`: 헤더 제목, 공유 텍스트 머리말
- `ADMIN_PASSWORD_HASH`: 관리자 비밀번호의 SHA-256 해시 (`printf '비밀번호' | shasum -a 256`)
- 정적 파일(`index.html`, `public/manifest.json`, `public/icons/`)의 이름·아이콘은 따로 바꿔야 함

## 프론트엔드

- React 19 + TypeScript, Vite 6, Tailwind CSS 4. Express(`server.ts`)는 Vite 미들웨어와 정적 파일 서빙만 담당 (포트 3300)
- PWA: `public/manifest.json` + `public/sw.js`. SW는 배포 빌드에서만 등록하고(`src/main.tsx`), 같은 origin 파일과 폰트만 캐시함 (Supabase 응답은 캐시하지 않음)

## 디자인 — "Digital Wellness"

- 토큰은 `src/index.css`의 `@theme`: paper `#FDFCF8`, sage `#E8EFE8`, lavender `#EFEDF4`, peach `#FFB7B2`(포인트), ink `#292524`, muted `#78716C`
- 폰트: Jua(본문·제목, 한글·영문 모두 포함, 굵기 1종이라 가짜 볼드는 끔) + Reenie Beanie(영문 손글씨 강조)
- 컨테이너 radius 2–2.5rem, 부드러운 그림자, 35% 노이즈 그레인(`.grain`), 떠다니는 블러 블롭(`.blob`), 스크롤 등장(`useReveal`)

## 데이터 — Supabase

- `schedules` / `schedule_attendees` 공용 테이블, 항상 `company = COMPANY_CODE`로만 읽고 씀
- 인증 없음 (anon key). 관리자 모드·참석자 비밀번호 모두 브라우저에서만 대조하는 가벼운 잠금장치
- "이벤트 하나만 변경" 원칙: 일정 필드 / 참석자 추가·삭제·이름변경을 각각 단일 행 단위로 저장 (`src/lib/supabaseApi.ts`)
- 삭제는 참석자에 `삭제됨`을 추가하는 방식 (`deleted_at`은 쓰지 않음)

## 권한

| 동작 | 일반 사용자 | 관리자 모드 |
|---|---|---|
| 일정 보기·검색·링크 복사 | O | O |
| 참석 등록 / 공유 메모 작성 | O | O |
| 참석 취소 | 본인 비밀번호 필요(설정한 경우) | 비밀번호 없이 가능 |
| 일정 등록·수정·삭제 | X | O |
