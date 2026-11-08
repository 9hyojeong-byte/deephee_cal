import { ScheduleEvent } from '../types';
import { formatTime } from './timeUtils';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// "10월 24일" / "10월 24일 (토)"
export function formatKoreanDate(dateStr: string, includeDayOfWeek: boolean = false): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const date = new Date(year, month, day);
  if (isNaN(date.getTime())) return dateStr;
  const formatted = `${month + 1}월 ${day}일`;
  return includeDayOfWeek ? `${formatted} (${DAY_NAMES[date.getDay()]})` : formatted;
}

// "2부" / "14:00 ~ 16:00" / "하루종일"
export function getEventTimeLabel(ev: ScheduleEvent): string {
  if (ev.location && ev.location.trim().includes('자유일정')) return '하루종일';
  if (!ev.startTime) return '하루종일';
  return `${formatTime(ev.startTime)}${ev.endTime ? ` ~ ${formatTime(ev.endTime)}` : ''}`;
}

// 이 앱은 일정 제목(=작성자명이 들어간 자동 제목)을 화면에 보여주지 않으므로,
// 일정을 가리켜야 할 때는 날짜·수업 종류·장소·시간으로 부른다. 예: "10월 24일 (토) · 머메이드 · 딥스 · 2부"
export function describeEvent(ev: ScheduleEvent): string {
  return [formatKoreanDate(ev.date, true), ev.classType, ev.location || '일반', getEventTimeLabel(ev)].filter(Boolean).join(' · ');
}
