import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Plus, MoreHorizontal, CalendarDays, Link } from 'lucide-react';
import { ScheduleEvent } from '../types';
import { isPastDate } from '../lib/timeUtils';
import { getParticipantsList } from '../lib/authors';
import { linkifyText } from '../lib/linkify';
import { getLocationTone } from '../lib/locationColors';
import { CLASS_TYPE_TONES } from '../lib/classTypes';
import { useReveal } from '../lib/useReveal';
import { SHARE_LABEL } from '../lib/appConfig';
import { formatKoreanDate, getEventTimeLabel, describeEvent } from '../lib/eventLabel';

interface EventListViewProps {
  selectedDate: string;
  events: ScheduleEvent[];
  isAdminMode: boolean;
  onEditEvent: (event: ScheduleEvent) => void;
  onDeleteEvent: (id: string) => void;
  onAddEventClick: () => void;
  onEventClick: (event: ScheduleEvent) => void;
  onSelectDate: (dateStr: string) => void;
  searchQuery?: string;
}

const formatBadgeDate = (dateStr: string) => {
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return { day: dateStr, dow: '' };
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const date = new Date(parseInt(parts[0], 10), month - 1, day);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    return { day: `${month}/${day}`, dow: dayNames[date.getDay()] };
  } catch {
    return { day: dateStr, dow: '' };
  }
};

const isNewSchedule = (createdAt: string): boolean => {
  if (!createdAt) return false;
  const createdTime = new Date(createdAt).getTime();
  if (isNaN(createdTime)) return false;
  const diffTime = Date.now() - createdTime;
  const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
  return diffTime <= threeDaysInMs;
};

const smallIconButton =
  'w-9 h-9 rounded-full bg-paper hover:bg-lavender text-muted hover:text-ink flex items-center justify-center press cursor-pointer';

function EventCard({
  ev,
  isAdminMode,
  onEventClick,
  onOpenMenu,
}: {
  ev: ScheduleEvent;
  isAdminMode: boolean;
  onEventClick: (e: ScheduleEvent) => void;
  onOpenMenu: (e: ScheduleEvent) => void;
}) {
  const revealRef = useReveal<HTMLDivElement>();
  const [showCopyToast, setShowCopyToast] = useState(false);
  const isPast = isPastDate(ev.date);
  const tone = getLocationTone(ev.location);
  const badge = formatBadgeDate(ev.date);
  const participants = getParticipantsList(ev.attendees);

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const formattedDate = ev.endDate
      ? `${formatKoreanDate(ev.date, true)} ~ ${formatKoreanDate(ev.endDate, true)}`
      : formatKoreanDate(ev.date, true);
    const timeText = getEventTimeLabel(ev);
    const deepTankText = ev.deepTankUsage ? `, 딥탱크: ${ev.deepTankUsage}` : '';
    const locationText = ev.location || '일반';
    const url = `${window.location.origin}${window.location.pathname}?scheduleId=${ev.id}`;

    const attendeesText = participants.length > 0
      ? `${participants.join(', ')} (${participants.length}명)`
      : '없음';

    const textToCopy = `📅 [${SHARE_LABEL}]
• 일시: ${formattedDate} (${timeText}${deepTankText})
• 장소: ${locationText}
${ev.classType ? `• 수업: ${ev.classType}\n` : ''}• 메모: ${ev.description || '-'}
• 참석자: ${attendeesText}
🔗 링크: ${url}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setShowCopyToast(true);
      setTimeout(() => setShowCopyToast(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      alert('링크 복사에 실패했습니다.');
    }
  };

  return (
    <>
      <div
        ref={revealRef}
        className={`reveal rounded-[2rem] shadow-soft flex items-start gap-3 p-4 ${isPast ? 'bg-white/50 opacity-60' : 'bg-white/80'}`}
      >
        <div onClick={() => onEventClick(ev)} className="flex-1 flex items-start gap-3.5 cursor-pointer min-w-0">
          <div className={`${isPast ? 'bg-stone-100 text-muted' : `${tone.soft} ${tone.text}`} rounded-[1.5rem] text-center shrink-0 w-[76px] py-3 flex flex-col items-center justify-center gap-1`}>
            <p className="text-lg font-semibold leading-none tracking-tight">{badge.day}</p>
            <p className="text-[11px] leading-none opacity-80">{badge.dow}요일</p>
            <p className="text-xs font-medium leading-none mt-1 truncate max-w-[68px]">{ev.location || '일반'}</p>
            <p className="text-[11px] leading-none opacity-80">{getEventTimeLabel(ev)}</p>
          </div>
          {/* 이 앱은 제목·작성자를 보여주지 않는다: 참석 인원 → 메모 → 참석자 순 */}
          <div className="flex-1 min-w-0 self-center">
            <div>
              {ev.classType && (
                <span className={`inline-block text-xs px-2.5 py-0.5 rounded-full align-middle mr-1.5 ${isPast ? 'bg-stone-100 text-muted' : `${CLASS_TYPE_TONES[ev.classType].soft} ${CLASS_TYPE_TONES[ev.classType].text}`}`}>
                  {ev.classType}
                </span>
              )}
              <span className="text-base font-medium text-ink leading-snug align-middle mr-1.5">
                {participants.length > 0 ? `참석 ${participants.length}명` : '참석자 모집 중'}
              </span>
              {!isPast && isNewSchedule(ev.createdAt) && (
                <span className="font-hand text-xl text-peach-deep align-middle -rotate-3 inline-block">new!</span>
              )}
            </div>
            {ev.description && (
              <p className="text-xs text-muted mt-1 leading-relaxed break-all whitespace-pre-line max-h-10 overflow-hidden">
                {linkifyText(ev.description)}
              </p>
            )}
            {participants.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {participants.map((name) => (
                  <span key={name} className="text-[11px] px-2.5 py-0.5 rounded-full bg-lavender text-lavender-deep">
                    {name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 self-center flex flex-col items-center gap-1.5">
          <button onClick={handleCopyLink} className={smallIconButton} title="일정 링크 복사" aria-label="일정 링크 복사">
            <Link className="w-4 h-4" strokeWidth={1.75} />
          </button>
          {isAdminMode && (
            <button
              onClick={(e) => { e.stopPropagation(); onOpenMenu(ev); }}
              className={smallIconButton}
              title="일정 관리"
              aria-label="일정 관리"
            >
              <MoreHorizontal className="w-4 h-4" strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>

      {showCopyToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-ink text-paper text-sm px-5 py-3 rounded-full shadow-soft-lg z-[160] animate-fade-up whitespace-nowrap">
          일정 링크가 복사되었어요 🔗
        </div>
      )}
    </>
  );
}

export default function EventListView({
  selectedDate,
  events,
  isAdminMode,
  onEditEvent,
  onDeleteEvent,
  onAddEventClick,
  onEventClick,
  onSelectDate,
  searchQuery,
}: EventListViewProps) {
  const [menuEvent, setMenuEvent] = useState<ScheduleEvent | null>(null);

  // 모달 외부 클릭 시 닫기
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.menu-modal-backdrop') && !target.closest('.menu-modal-content')) {
        setMenuEvent(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // 관리자 모드가 꺼지면 열려 있던 관리 메뉴도 닫는다.
  useEffect(() => {
    if (!isAdminMode) setMenuEvent(null);
  }, [isAdminMode]);

  const handleDeleteClick = (ev: ScheduleEvent) => {
    if (window.confirm(`${describeEvent(ev)} 일정을 정말로 삭제하시겠습니까?`)) {
      onDeleteEvent(ev.id);
    }
  };

  // 1. 데이터 준비 (필터링 및 정렬)
  let displayEvents: ScheduleEvent[] = [];
  let isFiltered = false;

  if (selectedDate) {
    isFiltered = true;
    displayEvents = events
      .filter(e => {
        if (e.endDate) {
          return selectedDate >= e.date && selectedDate <= e.endDate;
        }
        return e.date === selectedDate;
      })
      .sort((a, b) => {
        if (!a.startTime) return -1;
        if (!b.startTime) return 1;
        return a.startTime.localeCompare(b.startTime);
      });
  } else {
    isFiltered = false;
    if (searchQuery && searchQuery.trim()) {
      // 검색 시에는 과거 일정도 포함하여 출력
      const todayOrFutureEvents = events.filter(e => !isPastDate(e.endDate || e.date));
      const pastEvents = events.filter(e => isPastDate(e.endDate || e.date));

      // 오늘~미래 일정은 날짜 이른 순(오름차순) 정렬
      todayOrFutureEvents.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        if (!a.startTime) return -1;
        if (!b.startTime) return 1;
        return a.startTime.localeCompare(b.startTime);
      });

      // 과거 일정은 최근 날짜 순(내림차순) 정렬
      pastEvents.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        if (!a.startTime) return -1;
        if (!b.startTime) return 1;
        return a.startTime.localeCompare(b.startTime);
      });

      displayEvents = [...todayOrFutureEvents, ...pastEvents];
    } else {
      // 일반 전체 보기 시에는 과거 일정을 제외하고 날짜 이른 순(오름차순) 정렬
      displayEvents = events
        .filter(e => !isPastDate(e.endDate || e.date))
        .sort((a, b) => {
          const dateCompare = a.date.localeCompare(b.date);
          if (dateCompare !== 0) return dateCompare;
          if (!a.startTime) return -1;
          if (!b.startTime) return 1;
          return a.startTime.localeCompare(b.startTime);
        });
    }
  }

  return (
    <div className="space-y-4">
      {/* ── 헤더 영역 ── */}
      <div className="flex items-end justify-between px-1">
        <div>
          <span className="font-hand text-[24px] text-muted block -mb-1 -rotate-1">
            {isFiltered ? 'on this day' : 'coming up'}
          </span>
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-semibold tracking-tight text-ink">
              {isFiltered ? `${formatKoreanDate(selectedDate, true)}` : '다가오는 일정'}
            </h3>
            <span className="min-w-7 h-7 px-2 bg-sage text-sage-deep text-sm font-medium rounded-full inline-flex items-center justify-center">
              {displayEvents.length}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 pb-0.5">
          {isFiltered && (
            <button
              onClick={() => onSelectDate('')}
              className="px-4 py-2 bg-white/80 text-muted text-sm rounded-full press cursor-pointer hover:text-ink shadow-soft"
            >
              전체보기
            </button>
          )}
          {isAdminMode && (
            <button
              onClick={onAddEventClick}
              className="flex items-center gap-1 px-4 py-2 bg-ink text-paper text-sm font-medium rounded-full press cursor-pointer"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              <span>추가</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 리스트 영역 ── */}
      {displayEvents.length === 0 ? (
        <EmptyState isSearch={!!searchQuery} isAdminMode={isAdminMode} />
      ) : (
        <div className="space-y-3">
          {displayEvents.map((ev) => (
            <EventCard
              key={ev.id}
              ev={ev}
              isAdminMode={isAdminMode}
              onEventClick={onEventClick}
              onOpenMenu={setMenuEvent}
            />
          ))}
        </div>
      )}

      {/* ── 일정 관리 오버레이 모달 (관리자 전용) ── */}
      {menuEvent && isAdminMode && (
        <div className="fixed inset-0 bg-ink/20 z-50 flex items-center justify-center p-4 backdrop-blur-md menu-modal-backdrop animate-fade-up">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-paper rounded-[2.5rem] w-full max-w-[300px] shadow-soft-lg flex flex-col p-6 space-y-5 menu-modal-content"
          >
            <div className="text-center">
              <span className="font-hand text-2xl text-muted">manage</span>
              <h4 className="text-base font-medium text-ink leading-snug px-1">
                {describeEvent(menuEvent)}
              </h4>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  const ev = menuEvent;
                  setMenuEvent(null);
                  onEditEvent(ev);
                }}
                className="w-full py-3 bg-ink text-paper font-medium text-sm rounded-full press flex items-center justify-center gap-2 cursor-pointer"
              >
                <Edit2 className="w-4 h-4" strokeWidth={1.75} />
                <span>수정하기</span>
              </button>

              <button
                onClick={() => {
                  const ev = menuEvent;
                  setMenuEvent(null);
                  handleDeleteClick(ev);
                }}
                className="w-full py-3 bg-peach/50 text-peach-deep font-medium text-sm rounded-full press flex items-center justify-center gap-2 cursor-pointer hover:bg-peach/70"
              >
                <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                <span>삭제하기</span>
              </button>

              <button
                onClick={() => setMenuEvent(null)}
                className="w-full py-3 text-muted text-sm rounded-full press cursor-pointer hover:bg-white"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ isSearch, isAdminMode }: { isSearch?: boolean; isAdminMode: boolean }) {
  return (
    <div className="text-center py-12 bg-white/60 rounded-[2.5rem] shadow-soft flex flex-col items-center gap-3">
      <div className="w-16 h-16 rounded-full bg-sage flex items-center justify-center animate-float">
        <CalendarDays className="w-7 h-7 text-sage-deep" strokeWidth={1.5} />
      </div>
      <div>
        <p className="font-hand text-3xl text-ink">
          {isSearch ? 'nothing here…' : 'all quiet'}
        </p>
        <p className="text-sm text-muted mt-1">
          {isSearch
            ? '다른 이름으로 검색해보세요'
            : isAdminMode
              ? '+ 버튼으로 새 일정을 추가해보세요'
              : '아직 예정된 일정이 없어요'}
        </p>
      </div>
    </div>
  );
}
