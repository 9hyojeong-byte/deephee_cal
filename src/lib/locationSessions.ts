// 풀장별 "부" 시간표와 입장 시각 계산. 라분다이브 캘린더(laboon_cal)의 시간표와 같은 값.
//
// 시간표는 날짜에 따라 바뀔 수 있어서 버전마다 `effectiveFrom`(YYYY-MM-DD, 그날 포함)을 둔다.
// 일정 날짜 기준으로 effectiveFrom이 그 날짜 이하인 마지막 버전을 쓴다. 버전은 날짜 오름차순으로 적는다.
interface LocationScheduleVersion {
  effectiveFrom: string;
  timeRanges: Record<string, { start: string; end: string }>;
}

const STANDARD_5_SESSIONS: LocationScheduleVersion['timeRanges'] = {
  '1부': { start: '8:00', end: '11:00' },
  '2부': { start: '11:00', end: '14:00' },
  '3부': { start: '14:00', end: '17:00' },
  '4부': { start: '17:00', end: '20:00' },
  '5부': { start: '20:00', end: '23:00' },
};

const LOCATION_SCHEDULE_VERSIONS: Record<string, LocationScheduleVersion[]> = {
  '딥스': [{ effectiveFrom: '2000-01-01', timeRanges: STANDARD_5_SESSIONS }],
  '파라': [{ effectiveFrom: '2000-01-01', timeRanges: STANDARD_5_SESSIONS }],
};

// 딥탱크 이용 시 부 시작 시각 대비 입장 시각 차이(분)
const DEEP_TANK_OFFSET_MIN: Record<string, number> = {
  '전반부이': -30,
  '후반부이': 30,
};

const DEEP_TANK_SHORT: Record<string, string> = {
  '전반부이': '전반',
  '후반부이': '후반',
};

function resolveVersion(location: string, dateStr: string): LocationScheduleVersion | undefined {
  const versions = LOCATION_SCHEDULE_VERSIONS[location];
  if (!versions || versions.length === 0) return undefined;
  let chosen = versions[0];
  for (const v of versions) {
    if (v.effectiveFrom <= dateStr) chosen = v;
    else break;
  }
  return chosen;
}

function shiftTime(time: string, offsetMin: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = (((h * 60 + m + offsetMin) % 1440) + 1440) % 1440;
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// 예: "10:30 입장 (2부 11:00~14:00 · 딥탱크 전반)". 시간표가 없는 풀장이면 null.
export function buildEntryMemo(
  location: string,
  session: string,
  deepTankUsage: string | null,
  dateStr: string
): string | null {
  const range = resolveVersion(location, dateStr)?.timeRanges[session];
  if (!range) return null;
  const offset = deepTankUsage ? DEEP_TANK_OFFSET_MIN[deepTankUsage] ?? 0 : 0;
  const entry = shiftTime(range.start, offset);
  const tank = deepTankUsage && DEEP_TANK_SHORT[deepTankUsage] ? ` · 딥탱크 ${DEEP_TANK_SHORT[deepTankUsage]}` : '';
  return `${entry} 입장 (${session} ${range.start}~${range.end}${tank})`;
}

const AUTO_MEMO_RE = /^\d{1,2}:\d{2} 입장 \(\d부 [^)]*\)$/;
const LEGACY_AUTO_MEMOS = ['30분 빠른입장', '30분 늦은입장'];

// 메모가 비어 있거나 자동으로 넣은 문구(옛 형식 포함)라서 덮어써도 되는지
export function isAutoEntryMemo(memo: string): boolean {
  const trimmed = memo.trim();
  return !trimmed || AUTO_MEMO_RE.test(trimmed) || LEGACY_AUTO_MEMOS.includes(trimmed);
}
