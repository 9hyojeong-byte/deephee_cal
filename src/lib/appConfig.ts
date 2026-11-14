// 이 앱만의 정체성 값. 같은 Supabase 공용 테이블(schedules /
// schedule_attendees)을 프갤(dcfdg)·라분(laboon01) 캘린더와 함께 쓰므로,
// COMPANY_CODE는 다른 앱과 절대 겹치면 안 된다.
// (manifest.json / index.html의 이름·아이콘은 정적 파일이라 따로 바꿔야 한다.)

export const COMPANY_CODE = 'deephee';

export const APP_NAME = '희선캘린더';

// 새 일정의 작성자(=첫 참석자)로 항상 들어가는 이름. 화면에는 표시하지 않는다.
export const AUTHOR_NAME = '우파루파';

// "프다갤에도 올리기"로 등록한 일정에 붙는 표식 참석자. 이 참석자가 있는 일정은
// 프갤 캘린더(dcfdg_cal)에도 함께 노출된다. 프갤 쪽 supabaseApi.ts의 값과 같아야 한다.
export const CROSS_POST_ATTENDEE = '깍뚜기벙';

// 제목 옆 "문의하기" 버튼이 여는 카카오톡 오픈채팅 주소
export const CONTACT_URL = 'http://qr.kakao.com/talk/MkzXW0EF7tz54cp1Wyj7wtYyZA4-';

// 일정 상세 화면의 "공유 메모"(누구나 작성 가능) 영역을 보여줄지. 희선캘린더는 쓰지 않아 숨긴다.
export const SHOW_SHARED_MEMO = false;

// 공유 텍스트 머리말: "📅 [희선캘린더]"
export const SHARE_LABEL = APP_NAME;

// 관리자 모드 비밀번호의 SHA-256 해시 (평문은 소스에 두지 않는다).
// 바꾸려면: printf '새비밀번호' | shasum -a 256
// 백엔드 없이 브라우저에서만 대조하는 가벼운 잠금장치라, 진짜 보안 경계는 아님.
export const ADMIN_PASSWORD_HASH = 'fbfb386efea67e816f2dda0a8c94a98eb203757aebb3f55f183755a192d44467';
