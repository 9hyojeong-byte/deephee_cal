import React from 'react';
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { ScheduleEvent } from '../types';
import { isPastDate } from '../lib/timeUtils';
import { getDotColorClass, LOCATION_COLORS, HIDDEN_LOCATIONS } from '../lib/locationColors';
import { useReveal } from '../lib/useReveal';

type WeekStart = 'sun' | 'mon';
const WEEK_START_STORAGE_KEY = 'calendarWeekStart';

const MONTH_NAMES_EN = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

function loadWeekStart(): WeekStart {
  const saved = localStorage.getItem(WEEK_START_STORAGE_KEY);
  return saved === 'sun' ? 'sun' : 'mon';
}

interface CalendarViewProps {
  currentDate: Date;
  selectedDate: string;
  events: ScheduleEvent[];
  onSelectDate: (dateStr: string) => void;
  onNavigateMonth: (offset: number) => void;
  selectedLocation: string | null;
  onSelectLocation: (location: string | null) => void;
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const navButton =
  'w-10 h-10 rounded-full bg-paper hover:bg-sage flex items-center justify-center press cursor-pointer text-ink';

export default function CalendarView({
  currentDate,
  selectedDate,
  events,
  onSelectDate,
  onNavigateMonth,
  selectedLocation,
  onSelectLocation,
}: CalendarViewProps) {
  const revealRef = useReveal<HTMLDivElement>();
  const legendRef = React.useRef<HTMLDivElement>(null);
  const weekSettingRef = React.useRef<HTMLDivElement>(null);
  const [weekStart, setWeekStart] = React.useState<WeekStart>(loadWeekStart);
  const [isWeekSettingOpen, setIsWeekSettingOpen] = React.useState(false);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectedLocation && legendRef.current && !legendRef.current.contains(e.target as Node)) {
        onSelectLocation(null);
      }
      if (isWeekSettingOpen && weekSettingRef.current && !weekSettingRef.current.contains(e.target as Node)) {
        setIsWeekSettingOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedLocation, onSelectLocation, isWeekSettingOpen]);

  const handleSelectWeekStart = (value: WeekStart) => {
    setWeekStart(value);
    localStorage.setItem(WEEK_START_STORAGE_KEY, value);
    setIsWeekSettingOpen(false);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = weekStart === 'sun'
    ? new Date(year, month, 1).getDay()
    : (new Date(year, month, 1).getDay() + 6) % 7;
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const gridItems: { dateStr: string; dayNum: number; isCurrentMonth: boolean; dow: number }[] = [];

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = prevMonthTotalDays - i;
    const dateObj = new Date(year, month - 1, d);
    gridItems.push({ dateStr: formatLocalDate(dateObj), dayNum: d, isCurrentMonth: false, dow: dateObj.getDay() });
  }
  for (let d = 1; d <= totalDays; d++) {
    const dateObj = new Date(year, month, d);
    gridItems.push({ dateStr: formatLocalDate(dateObj), dayNum: d, isCurrentMonth: true, dow: dateObj.getDay() });
  }
  const nextPad = 42 - gridItems.length;
  for (let d = 1; d <= nextPad; d++) {
    const dateObj = new Date(year, month + 1, d);
    gridItems.push({ dateStr: formatLocalDate(dateObj), dayNum: d, isCurrentMonth: false, dow: dateObj.getDay() });
  }

  const getEventsForDay = (dateStr: string) =>
    events.filter(e => {
      if (e.endDate) {
        return dateStr >= e.date && dateStr <= e.endDate;
      }
      return e.date === dateStr;
    });
  const todayStr = formatLocalDate(new Date());

  const daysOfWeek = weekStart === 'sun'
    ? ['일', '월', '화', '수', '목', '금', '토']
    : ['월', '화', '수', '목', '금', '토', '일'];

  return (
    <div ref={revealRef} className="reveal bg-white/70 backdrop-blur-sm rounded-[2.5rem] shadow-soft p-5">

      {/* ── Calendar Header ── */}
      <div className="flex items-end justify-between mb-5 px-1">
        <div className="relative" ref={weekSettingRef}>
          <span className="font-hand text-[26px] text-peach-deep block -mb-1 -rotate-2">
            {MONTH_NAMES_EN[month]}
          </span>
          <div className="flex items-baseline gap-2">
            <h2 className="text-[38px] font-semibold tracking-tight leading-none text-ink whitespace-nowrap">
              {month + 1}월
            </h2>
            <span className="text-sm text-muted">{year}</span>
            <button
              onClick={() => setIsWeekSettingOpen((prev) => !prev)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-paper transition cursor-pointer self-center"
              title="캘린더 설정"
              aria-label="캘린더 설정"
            >
              <Settings className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>

          {isWeekSettingOpen && (
            <div className="absolute top-full left-0 mt-2 z-20 w-44 bg-white rounded-[1.5rem] shadow-soft-lg p-2 animate-fade-up">
              <p className="text-xs text-muted px-3 pt-1 pb-2">시작 요일</p>
              {([
                { value: 'sun' as const, label: '일요일 시작' },
                { value: 'mon' as const, label: '월요일 시작' },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSelectWeekStart(opt.value)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-full text-sm transition cursor-pointer
                    ${weekStart === opt.value ? 'bg-sage text-ink font-medium' : 'text-muted hover:bg-paper'}`}
                >
                  <span>{opt.label}</span>
                  {weekStart === opt.value && <span className="text-sage-deep">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 pb-1">
          <button onClick={() => onNavigateMonth(-1)} className={navButton} aria-label="이전 달">
            <ChevronLeft className="w-4 h-4" strokeWidth={2} />
          </button>

          <button
            onClick={() => {
              const today = new Date();
              onSelectDate(formatLocalDate(today));
              const offset = (today.getFullYear() - year) * 12 + (today.getMonth() - month);
              if (offset !== 0) onNavigateMonth(offset);
            }}
            className="px-4 h-10 bg-ink text-paper text-sm font-medium rounded-full press cursor-pointer hover:bg-ink/90 whitespace-nowrap"
          >
            오늘
          </button>

          <button onClick={() => onNavigateMonth(1)} className={navButton} aria-label="다음 달">
            <ChevronRight className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* ── Day Labels ── */}
      <div className="grid grid-cols-7 text-center mb-1">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className={`text-xs py-1 ${day === '일' ? 'text-peach-deep' : day === '토' ? 'text-[#4F7699]' : 'text-muted'}`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* ── Days Grid ── */}
      <div className="grid grid-cols-7 gap-1">
        {gridItems.map(({ dateStr, dayNum, isCurrentMonth, dow }, idx) => {
          const isSelected = selectedDate === dateStr;
          const isToday = todayStr === dateStr;
          const dayEvents = getEventsForDay(dateStr);
          const hasEvents = dayEvents.length > 0;
          const isPast = isPastDate(dateStr);

          let numColor = 'text-ink';
          if (!isCurrentMonth) numColor = 'text-stone-300';
          else if (dow === 0) numColor = 'text-peach-deep';
          else if (dow === 6) numColor = 'text-[#4F7699]';

          return (
            <button
              key={`${dateStr}-${idx}`}
              onClick={() => onSelectDate(isSelected ? '' : dateStr)}
              aria-label={`${dateStr}${hasEvents ? `, 일정 ${dayEvents.length}개` : ''}`}
              aria-pressed={isSelected}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-full transition-colors duration-200 outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-peach
                ${isSelected
                  ? 'bg-ink'
                  : isToday
                    ? 'bg-peach'
                    : hasEvents && isCurrentMonth
                      ? isPast ? 'bg-stone-100/70 hover:bg-stone-100' : 'bg-sage/70 hover:bg-sage'
                      : 'hover:bg-paper'}
              `}
            >
              <span className={`text-[15px] leading-none
                ${isSelected ? 'text-paper font-semibold'
                  : isToday ? 'text-ink font-semibold'
                  : `${numColor} ${isCurrentMonth ? 'font-medium' : ''}`}`}>
                {dayNum}
              </span>

              {hasEvents && (
                <div className="absolute bottom-1.5 flex gap-0.5 justify-center">
                  {dayEvents.slice(0, 3).map((ev, eIdx) => (
                    <span
                      key={ev.id || eIdx}
                      className={`w-1 h-1 rounded-full
                        ${isSelected
                          ? 'bg-paper'
                          : isToday
                            ? 'bg-ink'
                            : isPast
                              ? 'bg-stone-300'
                              : getDotColorClass(ev.location)}`}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Legend / location filter ── */}
      <div
        ref={legendRef}
        className="mt-5 pt-4 border-t border-line flex flex-wrap items-center justify-center gap-1.5"
      >
        {Object.entries(LOCATION_COLORS).filter(([name]) => !HIDDEN_LOCATIONS.includes(name)).map(([name, colors]) => {
          const isActive = selectedLocation === name;
          const isAnyActive = selectedLocation !== null;
          return (
            <button
              key={name}
              onClick={(e) => {
                e.stopPropagation();
                onSelectLocation(isActive ? null : name);
              }}
              aria-pressed={isActive}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all duration-200 cursor-pointer
                ${isActive ? `${colors.soft} ${colors.text} font-medium` : 'text-muted hover:bg-paper'}
                ${isAnyActive && !isActive ? 'opacity-40' : 'opacity-100'}
              `}
            >
              <span className={`w-2 h-2 rounded-full ${colors.bg}`} />
              <span>{name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
