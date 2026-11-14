import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, AlignLeft, Check, MapPin, Waves, Sparkles } from 'lucide-react';
import { ScheduleEvent, CLASS_TYPES, ClassType, PERSONAL_SCHEDULE } from '../types';
import { normalizeToHourLabel } from '../lib/timeUtils';
import { LOCATION_COLORS } from '../lib/locationColors';
import { CLASS_TYPE_TONES } from '../lib/classTypes';
import { getAuthorName, getAttendeesList, isCrossPosted } from '../lib/authors';
import { AUTHOR_NAME, CROSS_POST_ATTENDEE } from '../lib/appConfig';
import { buildEntryMemo, isAutoEntryMemo } from '../lib/locationSessions';

interface EventFormProps {
  selectedDate: string;
  editingEvent: ScheduleEvent | null;
  onSave: (event: Omit<ScheduleEvent, 'createdAt'>) => void;
  onCancel: () => void;
}

// 장소 버튼 목록. 희선강사는 파라다이브를 이용하지 않아서 '파라'는 넣지 않는다.
const LOCATIONS = ['딥스', '성남', '수원', '자유일정'] as const;
type LocationType = typeof LOCATIONS[number];
const SESSIONS = ['1부', '2부', '3부', '4부', '5부'] as const;
const HOURS = Array.from({ length: 24 }, (_, i) => `${i}시`);

const labelCls = 'text-sm text-muted flex items-center gap-1.5 px-1';
const inputCls =
  'w-full px-5 py-3.5 border border-line bg-white rounded-full text-[15px] text-ink input-soft placeholder:text-muted/60';
const choiceCls = (active: boolean) =>
  `py-2.5 text-sm rounded-full transition cursor-pointer press ${
    active ? 'bg-ink text-paper font-medium' : 'bg-white text-muted border border-line hover:text-ink'
  }`;

function buildAutoTitle(
  authorName: string,
  loc: string,
  sess: string,
  hr: string,
  deepTank: string | null,
  allDay: boolean
): string {
  const parts: string[] = [];
  const trimmedAuthor = authorName.trim();
  if (trimmedAuthor) {
    parts.push(trimmedAuthor);
  }
  parts.push(loc);

  const timeStr = allDay ? '하루종일' : (loc === '딥스' ? sess : hr);
  parts.push(timeStr);

  if (!allDay && loc === '딥스' && deepTank) {
    if (deepTank === '전반부이' || deepTank === '전반') {
      parts.push('전반');
      parts.push('빠입');
    } else if (deepTank === '후반부이' || deepTank === '후반') {
      parts.push('후반');
      parts.push('늦입');
    }
  }

  return parts.join('/');
}

export default function EventForm({ selectedDate, editingEvent, onSave, onCancel }: EventFormProps) {
  // 작성자는 입력받지 않는다: 새 일정은 항상 AUTHOR_NAME, 기존 일정은 원래 작성자 유지.
  const [author, setAuthor] = useState(AUTHOR_NAME);
  const [title, setTitle] = useState('');
  const [isTitleUserModified, setIsTitleUserModified] = useState(false);
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState<LocationType>('딥스');
  const [classType, setClassType] = useState<ClassType | null>(null);
  const [isAllDay, setIsAllDay] = useState(false);
  const [session, setSession] = useState('1부');
  const [hour, setHour] = useState('12시');
  const [deepTankUsage, setDeepTankUsage] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  // "프다갤에도 올리기": 켜면 제목 입력칸을 보여주고, 저장 시 CROSS_POST_ATTENDEE를 참석자로 넣어 프갤 캘린더에도 노출한다.
  const [crossPost, setCrossPost] = useState(false);
  // 수업 종류 '개인일정': 장소·시간 없이 그날 수업이 없다는 공지만 올린다.
  const isPersonal = classType === PERSONAL_SCHEDULE;
  const makeAutoTitle = () =>
    isPersonal
      ? [author.trim(), PERSONAL_SCHEDULE].filter(Boolean).join('/')
      : buildAutoTitle(author, location, session, hour, deepTankUsage, isAllDay);

  useEffect(() => {
    if (editingEvent) {
      setCrossPost(isCrossPosted(editingEvent.attendees));
      setTitle(editingEvent.title);
      setIsTitleUserModified(true); // 기존 수정 건은 유저 수정 상태로 유지
      setDate(editingEvent.date);
      setEndDate(editingEvent.endDate || editingEvent.date);
      setDescription(editingEvent.description || '');
      setDeepTankUsage(editingEvent.deepTankUsage || null);
      setClassType(editingEvent.classType ?? null);

      setAuthor(getAuthorName(editingEvent.attendees) || AUTHOR_NAME);

      let detLocation: LocationType = '딥스';
      if (editingEvent.location && LOCATIONS.includes(editingEvent.location as any)) {
        detLocation = editingEvent.location as LocationType;
      } else {
        const fullText = `${editingEvent.title} ${editingEvent.description || ''}`;
        if (fullText.includes('성남')) detLocation = '성남';
        else if (fullText.includes('수원')) detLocation = '수원';
        else if (fullText.includes('자유일정')) detLocation = '자유일정';
      }
      setLocation(detLocation);

      // '자유일정'은 특정 시각이 의미 없는 타입이라, 저장된 시각 데이터가
      // 남아있어도 무시하고 항상 하루 종일로 로드한다.
      const isDayAll = detLocation === '자유일정' || !editingEvent.startTime;
      setIsAllDay(isDayAll);
      if (!isDayAll && editingEvent.startTime) {
        const raw = editingEvent.startTime;
        if (detLocation === '딥스') {
          setSession(SESSIONS.includes(raw as any) ? raw : '1부');
        } else {
          setHour(normalizeToHourLabel(raw));
        }
      } else {
        setSession('1부');
        setHour('12시');
      }
    } else {
      setDate(selectedDate); setEndDate(selectedDate); setLocation('딥스');
      setIsAllDay(false); setSession('1부'); setHour('12시'); setDeepTankUsage(null); setDescription('');
      setAuthor(AUTHOR_NAME);
      setClassType(null);
      setCrossPost(false);
      setIsTitleUserModified(false);

      // 새 일정 초기 자동 제목 설정
      setTitle(buildAutoTitle(AUTHOR_NAME, '딥스', '1부', '12시', null, false));
    }
  }, [editingEvent, selectedDate]);

  const handleDeepTankClick = (option: string) => {
    setDeepTankUsage(deepTankUsage === option ? null : option);
  };

  // 풀장/날짜/부/딥탱크 이용시간이 바뀌면 메모에 입장 시각 자동 입력 ("10:30 입장 (2부 11:00~14:00 · 딥탱크 전반)").
  // 메모가 비어 있거나 자동 문구일 때만 바꾸고, 직접 쓴 메모는 건드리지 않는다.
  // 시간표가 없는 풀장(성남, 수원)이나 하루 종일이면 자동 문구만 지운다.
  useEffect(() => {
    const autoMemo = isAllDay || isPersonal ? null : buildEntryMemo(location, session, deepTankUsage, date);
    setDescription((prev) => (isAutoEntryMemo(prev) ? autoMemo ?? '' : prev));
  }, [location, session, deepTankUsage, date, isAllDay, isPersonal]);

  // 작성자/장소/시간/딥탱크 이용시간 변경 시 제목 자동 연결 ("작성자명/장소/시간/전반/빠입")
  useEffect(() => {
    if (!editingEvent && !isTitleUserModified) {
      setTitle(makeAutoTitle());
    }
  }, [author, location, session, hour, deepTankUsage, isAllDay, isPersonal, isTitleUserModified, editingEvent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 제목 칸이 숨겨져 있을 때(프다갤 미노출) 비어 있으면 자동 제목을 쓴다.
    const finalTitle = title.trim()
      || (crossPost ? '' : makeAutoTitle());
    if (!finalTitle || !date) { alert('일정 제목과 날짜는 필수입니다.'); return; }
    if (endDate && endDate < date) {
      alert('종료 날짜는 시작 날짜보다 빠를 수 없습니다.');
      return;
    }
    // 자유일정은 수업이 아니므로 수업 종류를 받지 않는다.
    if (location !== '자유일정' && !classType) { alert('수업 종류를 선택해 주세요.'); return; }

    // 수정할 때는 참석자 명단을 그대로 두고, 프다갤 표식 참석자만 체크 상태에 맞춰 넣고 뺀다.
    // 새 일정은 작성자 AUTHOR_NAME 한 명(+ 체크 시 표식 참석자)으로 시작한다.
    // DB의 참석자 행은 App.handleSaveEvent가 한 행씩 맞춘다.
    const baseList = editingEvent ? getAttendeesList(editingEvent.attendees) : [AUTHOR_NAME];
    const withoutMarker = baseList.filter((n) => n !== CROSS_POST_ATTENDEE);
    const nextList = crossPost && !isPersonal ? [...withoutMarker, CROSS_POST_ATTENDEE] : withoutMarker;
    const combinedAttendees: string | null = nextList.length > 0 ? nextList.join(', ') : null;

    let finalStartTime: string | null = null;
    if (!isAllDay && !isPersonal) {
      if (location === '딥스') {
        finalStartTime = session;
      } else {
        const hNum = parseInt(hour.replace('시', ''), 10);
        finalStartTime = `${String(hNum).padStart(2, '0')}:00`;
      }
    }

    onSave({
      ...editingEvent,
      id: editingEvent?.id || crypto.randomUUID(),
      title: finalTitle,
      date,
      endDate: endDate && endDate !== date ? endDate : null,
      startTime: finalStartTime,
      endTime: editingEvent ? editingEvent.endTime : null,
      deepTankUsage: location === '딥스' && !isPersonal ? (deepTankUsage || null) : null,
      description: description.trim() || null,
      location: isPersonal ? PERSONAL_SCHEDULE : location,
      classType: location === '자유일정' && !isPersonal ? null : classType,
      attendees: combinedAttendees,
    });
  };

  return (
    <div className="fixed inset-0 bg-ink/20 z-50 flex items-end sm:items-center justify-center backdrop-blur-md">
      <div className="bg-paper rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-soft-lg animate-sheet-up">

        {/* Header */}
        <div className="flex items-start justify-between px-7 pt-7 pb-3">
          <div>
            <span className="font-hand text-2xl text-peach-deep block -mb-1 -rotate-2">
              {editingEvent ? 'a little change' : 'something new'}
            </span>
            <h3 className="text-[32px] font-semibold tracking-tight leading-tight text-ink">
              {editingEvent ? '일정 수정' : '새 일정'}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="w-10 h-10 rounded-full bg-white shadow-soft hover:bg-lavender flex items-center justify-center press cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-4 h-4 text-ink" strokeWidth={2} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-7 pb-7 pt-2 space-y-5 max-h-[75vh] overflow-y-auto">

          {/* 1. Date Selection */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className={labelCls}>
                <Calendar className="w-4 h-4" strokeWidth={1.75} />
                {location === '자유일정' || isPersonal ? '시작 날짜' : '날짜'}
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  if ((location !== '자유일정' && !isPersonal) || !endDate || endDate < e.target.value) {
                    setEndDate(e.target.value);
                  }
                }}
                className={inputCls}
              />
            </div>

            {(location === '자유일정' || isPersonal) && (
              <div className="space-y-2 animate-fade-up">
                <label className={labelCls}>
                  <Calendar className="w-4 h-4" strokeWidth={1.75} />종료 날짜
                </label>
                <input
                  type="date"
                  required
                  value={endDate || date}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={date}
                  className={inputCls}
                />
              </div>
            )}
          </div>

          {/* 2. Class Type */}
          {location !== '자유일정' && (
            <div className="space-y-2">
              <label className={labelCls}>
                <Sparkles className="w-4 h-4" strokeWidth={1.75} />수업 종류
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {CLASS_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setClassType(type);
                      if (type === PERSONAL_SCHEDULE) {
                        setCrossPost(false);
                        setDeepTankUsage(null);
                      } else if (isPersonal) {
                        setEndDate(date); // 개인일정에서 수업으로 바꾸면 하루짜리로 되돌린다
                      }
                    }}
                    aria-pressed={classType === type}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm rounded-full transition cursor-pointer press
                      ${classType === type
                        ? `${CLASS_TYPE_TONES[type].soft} ${CLASS_TYPE_TONES[type].text} font-medium`
                        : 'bg-white text-muted border border-line hover:text-ink'}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${CLASS_TYPE_TONES[type].dot}`} />
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Location (개인일정은 장소 없음) */}
          {!isPersonal && (
          <div className="space-y-2">
            <label className={labelCls}>
              <MapPin className="w-4 h-4" strokeWidth={1.75} />장소
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => {
                    const isEnteringFreeSchedule = loc === '자유일정' && location !== '자유일정';
                    const isLeavingFreeSchedule = loc !== '자유일정' && location === '자유일정';

                    setLocation(loc);
                    if (loc === '딥스') {
                      setSession('1부');
                    } else {
                      setHour('12시');
                      setDeepTankUsage(null); // 성남, 수원, 자유일정 선택 시 딥탱크 사용시간 초기화
                    }
                    if (loc !== '자유일정') {
                      setEndDate(date);
                    }

                    // '자유일정'은 특정 시각이 의미 없는 타입이라 항상 하루 종일로 고정,
                    // 다른 타입으로 되돌아가면 다시 시각을 고를 수 있도록 되돌린다.
                    if (isEnteringFreeSchedule) {
                      setIsAllDay(true);
                    } else if (isLeavingFreeSchedule) {
                      setIsAllDay(false);
                    }
                  }}
                  aria-pressed={location === loc}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm rounded-full transition cursor-pointer press
                    ${location === loc
                      ? `${LOCATION_COLORS[loc].soft} ${LOCATION_COLORS[loc].text} font-medium`
                      : `bg-white text-muted border border-line ${LOCATION_COLORS[loc].hoverText}`}`}
                >
                  <span className={`w-2 h-2 rounded-full ${LOCATION_COLORS[loc].bg}`} />
                  {loc}
                </button>
              ))}
            </div>
          </div>

          )}

          {/* 4. Time Selection (개인일정은 시간 없음) */}
          {!isAllDay && !isPersonal && (
            <div className="space-y-4">
              <div className="space-y-2">
                {location === '딥스' ? (
                  <>
                    <label className={labelCls}>시간 (부 선택)</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {SESSIONS.map((sess) => (
                        <button
                          key={sess}
                          type="button"
                          onClick={() => setSession(sess)}
                          aria-pressed={session === sess}
                          className={choiceCls(session === sess)}
                        >
                          {sess}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <label className={labelCls}>시간 (정각 단위)</label>
                    <select
                      value={hour}
                      onChange={(e) => setHour(e.target.value)}
                      className={`${inputCls} appearance-none cursor-pointer`}
                    >
                      {HOURS.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </>
                )}
              </div>

              {/* 딥탱크 이용시간 (전반부이 / 후반부이) - 딥스 일때만 표시 */}
              {location === '딥스' && (
                <div className="space-y-3 bg-lavender p-5 rounded-[2rem] animate-fade-up">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-lavender-deep flex items-center gap-1.5">
                      <Waves className="w-4 h-4" strokeWidth={1.75} />
                      딥탱크 이용시간
                    </label>
                    {deepTankUsage && (
                      <button
                        type="button"
                        onClick={() => handleDeepTankClick(deepTankUsage)}
                        className="text-xs text-lavender-deep hover:underline cursor-pointer"
                      >
                        선택 해제
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {['전반부이', '후반부이'].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleDeepTankClick(option)}
                        aria-pressed={deepTankUsage === option}
                        className={`${choiceCls(deepTankUsage === option)} flex items-center justify-center gap-1.5 !border-transparent`}
                      >
                        <span>{option}</span>
                        {deepTankUsage === option && <Check className="w-4 h-4" strokeWidth={2} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* All Day Toggle (자유일정은 항상 하루 종일이라 토글 자체를 숨김) */}
          {location !== '자유일정' && !isPersonal && (
            <div className="flex items-center justify-between py-3.5 px-5 bg-white rounded-full border border-line">
              <span className="text-[15px] text-ink flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted" strokeWidth={1.75} />
                하루 종일
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isAllDay}
                aria-label="하루 종일"
                onClick={() => setIsAllDay(!isAllDay)}
                className={`w-12 h-7 rounded-full relative flex items-center transition-colors cursor-pointer
                  ${isAllDay ? 'bg-sage-deep' : 'bg-stone-200'}`}
              >
                <span className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform absolute
                  ${isAllDay ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          )}

          {/* 5. 프다갤에도 올리기 (체크 시에만 제목 입력칸 노출, 개인일정은 올리지 않음) */}
          {!isPersonal && (
          <label className="flex items-center gap-3 py-3.5 px-5 bg-white rounded-full border border-line cursor-pointer">
            <input
              type="checkbox"
              checked={crossPost}
              onChange={(e) => setCrossPost(e.target.checked)}
              className="w-5 h-5 accent-[#F2918A] cursor-pointer"
            />
            <span className="text-[15px] text-ink">프다갤에도 올리기</span>
          </label>
          )}

          {/* 6. Title (프다갤에 노출될 때만 보여준다) */}
          {crossPost && !isPersonal && (
          <div className="space-y-2 animate-fade-up">
            <div className="flex items-center justify-between">
              <label className={labelCls}>
                일정 제목
                <span className="text-xs text-muted/80">(프다갤 캘린더에서만 보여짐)</span>
              </label>
              {isTitleUserModified && !editingEvent && (
                <button
                  type="button"
                  onClick={() => setIsTitleUserModified(false)}
                  className="text-xs text-peach-deep hover:underline cursor-pointer px-1"
                >
                  자동 제목으로 되돌리기
                </button>
              )}
            </div>
            <input
              type="text"
              required
              placeholder="예: 범고래/수원/3시"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setIsTitleUserModified(true);
              }}
              className={inputCls}
            />
          </div>
          )}

          {/* 7. Description */}
          <div className="space-y-2">
            <label className={labelCls}>
              <AlignLeft className="w-4 h-4" strokeWidth={1.75} />메모
            </label>
            <textarea
              placeholder="함께 알면 좋은 내용을 적어주세요"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-5 py-4 border border-line bg-white rounded-[1.75rem] text-[15px] text-ink input-soft resize-none placeholder:text-muted/60"
            />
          </div>

          {/* 8. Action Buttons */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3.5 bg-white border border-line text-muted text-[15px] rounded-full press cursor-pointer hover:text-ink"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-[1.4] py-3.5 bg-peach text-ink font-medium text-[15px] rounded-full press cursor-pointer flex items-center justify-center gap-1.5 hover:brightness-105"
            >
              <Check className="w-4 h-4" strokeWidth={2} />
              저장하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
