import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, X, Download, RefreshCw, KeyRound, Instagram } from 'lucide-react';
import { ScheduleEvent } from './types';
import CalendarView from './components/CalendarView';
import EventListView from './components/EventListView';
import EventForm from './components/EventForm';
import EventDetailModal from './components/EventDetailModal';
import {
  fetchSchedules,
  saveSingleEvent,
  addAttendee,
  removeAttendee,
  renameAttendee,
  getAttendeePasswordHash,
  updateSharedMemo,
} from './lib/supabaseApi';
import { getAuthorName, isCrossPosted } from './lib/authors';
import { hashPassword } from './lib/passwordHash';
import { ADMIN_PASSWORD_HASH, INSTAGRAM_URL, CROSS_POST_ATTENDEE } from './lib/appConfig';

const ADMIN_MODE_STORAGE_KEY = 'isAdminMode';

function isEventDeleted(event: ScheduleEvent): boolean {
  if (!event.attendees) return false;
  return event.attendees.split(',').map(n => n.trim()).includes('삭제됨');
}

function isIOSDevice(): boolean {
  const ua = window.navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return true;
  // iPadOS 13+ reports itself as "Macintosh" but exposes multi-touch
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

function isRunningStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

const iconButton =
  'w-10 h-10 rounded-full flex items-center justify-center cursor-pointer press bg-white/70 text-ink shadow-soft hover:bg-white';

export default function App() {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);


  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<ScheduleEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  const installPromptRef = useRef<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const initialDeepLinkChecked = useRef(false);

  // 일정 등록/수정/삭제는 관리자 모드에서만 가능하다. 참석 등록·취소와
  // 공유 메모는 지금처럼 누구나 쓸 수 있다.
  const [isAdminMode, setIsAdminMode] = useState(() => localStorage.getItem(ADMIN_MODE_STORAGE_KEY) === 'true');

  const handleToggleAdminMode = async () => {
    if (isAdminMode) {
      setIsAdminMode(false);
      localStorage.removeItem(ADMIN_MODE_STORAGE_KEY);
      setToastMessage('관리자 모드가 해제되었어요.');
      return;
    }
    const input = window.prompt('관리자 비밀번호를 입력해주세요.');
    if (input === null) return;
    const inputHash = await hashPassword(input.trim());
    if (inputHash !== ADMIN_PASSWORD_HASH) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }
    setIsAdminMode(true);
    localStorage.setItem(ADMIN_MODE_STORAGE_KEY, 'true');
    setToastMessage('관리자 모드가 켜졌어요. 이 기기에서는 계속 유지돼요.');
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleOpenEventDetail = (event: ScheduleEvent) => {
    setSelectedEventForDetail(event);
    const newUrl = `${window.location.origin}${window.location.pathname}?scheduleId=${event.id}`;
    window.history.replaceState({}, document.title, newUrl);
  };

  const handleCloseEventDetail = () => {
    setSelectedEventForDetail(null);
    const newUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.replaceState({}, document.title, newUrl);
  };

  useEffect(() => {
    setIsStandalone(isRunningStandalone());

    const handler = (e: any) => {
      e.preventDefault();
      installPromptRef.current = e;
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const onInstalled = () => {
      installPromptRef.current = null;
      setCanInstall(false);
      setIsStandalone(true);
    };
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOSDevice()) {
      alert('홈 화면에 추가하기\n\n하단(또는 상단)의 공유 버튼을 누른 뒤 "홈 화면에 추가"를 선택해주세요.');
      return;
    }
    if (!installPromptRef.current) return;
    installPromptRef.current.prompt();
    const { outcome } = await installPromptRef.current.userChoice;
    if (outcome === 'accepted') {
      installPromptRef.current = null;
      setCanInstall(false);
    }
  };

  const showInstallButton = !isStandalone && (canInstall || isIOSDevice());

  const loadSchedules = useCallback(async () => {
    setIsLoading(true);
    setSyncStatus('syncing');
    try {
      const loadedEvents = await fetchSchedules();
      setEvents(loadedEvents);
      setSyncStatus('success');

      // Process deep link if not checked yet
      if (!initialDeepLinkChecked.current) {
        initialDeepLinkChecked.current = true;
        const params = new URLSearchParams(window.location.search);
        const scheduleId = params.get('scheduleId');
        if (scheduleId) {
          const activeEvents = loadedEvents.filter(e => !isEventDeleted(e));
          const matched = activeEvents.find(e => String(e.id) === String(scheduleId));
          if (matched) {
            setSelectedEventForDetail(matched);
            const targetDate = new Date(matched.date);
            if (!isNaN(targetDate.getTime())) {
              setCurrentCalendarDate(targetDate);
              setSelectedDate(matched.date);
            }
          } else {
            setToastMessage('존재하지 않거나 삭제된 일정입니다.');
            const newUrl = `${window.location.origin}${window.location.pathname}`;
            window.history.replaceState({}, document.title, newUrl);
          }
        }
      }
    } catch (err) {
      console.error('Error loading schedules:', err);
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  // 일정 자체(제목/날짜/장소 등)만 저장한다. 참석자는 절대 이 경로로
  // 통째로 동기화하지 않음 — 같은 일정을 두 사람이 거의 동시에 열어놓고
  // 있으면, 낡은 참석자 스냅샷이 서로의 변경을 덮어쓰는 버그가 생긴다.
  // 참석자 추가/삭제/작성자명 변경은 addAttendee/removeAttendee/
  // renameAttendee로 한 행만 건드릴 것.
  const saveEventFields = async (changedEvent: ScheduleEvent, opts?: { isNew?: boolean }) => {
    setSyncStatus('syncing');
    try {
      await saveSingleEvent(changedEvent, opts);
      setSyncStatus('success');
    } catch (err) {
      console.error('Failed to save event:', err);
      setSyncStatus('error');
    }
  };

  // 참석자 본인이 설정한 비밀번호가 있을 때만 검증한다 — 설정 안 했으면
  // 누구나(작성자 제외) 제외할 수 있다. 관리자는 비밀번호 없이 제외 가능.
  const verifyAttendeePassword = async (scheduleId: string, nickname: string): Promise<boolean> => {
    if (isAdminMode) return true;
    let storedHash: string | null;
    try {
      storedHash = await getAttendeePasswordHash(scheduleId, nickname);
    } catch (err) {
      console.error('Failed to check attendee password:', err);
      alert('비밀번호 확인 중 오류가 발생했습니다.');
      return false;
    }
    if (!storedHash) return true;

    const input = window.prompt(`"${nickname}" 님이 설정한 비밀번호를 입력해주세요.`);
    if (input === null) return false;
    const inputHash = await hashPassword(input.trim());
    if (inputHash !== storedHash) {
      alert('비밀번호가 일치하지 않습니다.');
      return false;
    }
    return true;
  };

  const openNewEventForm = () => {
    if (!isAdminMode) return;
    setEditingEvent(null);
    setIsFormOpen(true);
  };

  const handleEditEventClick = (ev: ScheduleEvent) => {
    if (!isAdminMode) return;
    setEditingEvent(ev);
    setIsFormOpen(true);
  };

  const handleSaveEvent = async (formEvent: Omit<ScheduleEvent, 'createdAt'>) => {
    if (!isAdminMode) return;
    const existingEvent = events.find(e => String(e.id) === String(formEvent.id));
    const isNew = !existingEvent;
    const savedEvent: ScheduleEvent = isNew
      ? { ...formEvent, createdAt: new Date().toISOString() }
      : { ...existingEvent, ...formEvent };
    setEvents(
      isNew
        ? [...events, savedEvent]
        : events.map(e => String(e.id) === String(formEvent.id) ? savedEvent : e)
    );
    setIsFormOpen(false);
    setEditingEvent(null);

    await saveEventFields(savedEvent, { isNew });

    // "프다갤에도 올리기" 체크 상태가 바뀌었으면 표식 참석자 행 하나만 넣거나 뺀다.
    // 새 일정은 saveSingleEvent가 작성자를 먼저 넣은 뒤에 추가되므로 작성자 순서가 유지된다.
    const wasCrossPosted = !isNew && isCrossPosted(existingEvent?.attendees);
    const nowCrossPosted = isCrossPosted(savedEvent.attendees);
    if (wasCrossPosted !== nowCrossPosted) {
      try {
        if (nowCrossPosted) await addAttendee(savedEvent.id, CROSS_POST_ATTENDEE);
        else await removeAttendee(savedEvent.id, CROSS_POST_ATTENDEE);
      } catch (err) {
        console.error('Failed to sync 프다갤 cross-post marker:', err);
        setSyncStatus('error');
      }
    }

    // 기존 일정을 수정한 경우, 작성자명이 바뀌었으면 그 참석자 행 하나만
    // 동기화한다 (다른 참석자는 손대지 않음).
    if (!isNew && existingEvent) {
      const oldAuthorName = getAuthorName(existingEvent.attendees);
      const newAuthorName = getAuthorName(savedEvent.attendees);
      if (oldAuthorName !== newAuthorName) {
        try {
          if (oldAuthorName && newAuthorName) {
            await renameAttendee(savedEvent.id, oldAuthorName, newAuthorName);
          } else if (oldAuthorName && !newAuthorName) {
            await removeAttendee(savedEvent.id, oldAuthorName);
          } else if (newAuthorName) {
            await addAttendee(savedEvent.id, newAuthorName);
          }
        } catch (err) {
          console.error('Failed to sync author change:', err);
          setSyncStatus('error');
        }
      }
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!isAdminMode) return;
    const target = events.find(e => String(e.id) === String(id));
    if (!target) return;
    const attendeesList = target.attendees ? target.attendees.split(',').map(n => n.trim()) : [];
    if (attendeesList.includes('삭제됨')) return;
    const updatedEvent = { ...target, attendees: [...attendeesList, '삭제됨'].join(', ') };
    setEvents(events.map(e => String(e.id) === String(id) ? updatedEvent : e));

    setSyncStatus('syncing');
    try {
      await addAttendee(id, '삭제됨');
      setSyncStatus('success');
    } catch (err) {
      console.error('Failed to delete event:', err);
      setSyncStatus('error');
    }
  };

  const handleAddAttendeeToEvent = async (eventId: string, nickname: string, password?: string) => {
    const target = events.find(e => String(e.id) === String(eventId));
    if (!target) return;
    const attendeesList = target.attendees ? target.attendees.split(',').map(n => n.trim()).filter(Boolean) : [];
    const updatedEvent = { ...target, attendees: [...attendeesList, nickname].join(', ') };
    setEvents(events.map(e => String(e.id) === String(eventId) ? updatedEvent : e));
    if (selectedEventForDetail && String(selectedEventForDetail.id) === String(eventId)) setSelectedEventForDetail(updatedEvent);

    setSyncStatus('syncing');
    try {
      const trimmedPassword = password?.trim();
      const passwordHash = trimmedPassword ? await hashPassword(trimmedPassword) : undefined;
      await addAttendee(eventId, nickname, passwordHash);
      setSyncStatus('success');
    } catch (err) {
      console.error('Failed to add attendee:', err);
      setSyncStatus('error');
    }
  };

  const handleRemoveAttendeeFromEvent = async (eventId: string, nickname: string) => {
    const passed = await verifyAttendeePassword(eventId, nickname);
    if (!passed) return;

    const target = events.find(e => String(e.id) === String(eventId));
    if (!target) return;
    const attendeesList = target.attendees ? target.attendees.split(',').map(n => n.trim()).filter(Boolean) : [];
    const updatedEvent = { ...target, attendees: attendeesList.filter(n => n !== nickname).join(', ') || null };
    setEvents(events.map(e => String(e.id) === String(eventId) ? updatedEvent : e));
    if (selectedEventForDetail && String(selectedEventForDetail.id) === String(eventId)) setSelectedEventForDetail(updatedEvent);

    setSyncStatus('syncing');
    try {
      await removeAttendee(eventId, nickname);
      setSyncStatus('success');
    } catch (err) {
      console.error('Failed to remove attendee:', err);
      setSyncStatus('error');
    }
  };

  // 비밀번호 없이 누구나 쓰는 공유 메모 저장. baseVersion은 모달이 편집을
  // 시작할 때 보고 있던 버전 — 그 사이 다른 사람이 먼저 저장했으면
  // 'conflict'를 돌려주고 로컬 상태를 최신 내용으로 갱신한다(덮어쓰지 않음).
  const handleUpdateSharedMemo = async (
    eventId: string,
    newMemo: string,
    baseVersion: number
  ): Promise<'saved' | 'conflict' | 'error'> => {
    const target = events.find(e => String(e.id) === String(eventId));
    if (!target) return 'error';

    try {
      const result = await updateSharedMemo(eventId, newMemo, baseVersion);

      if (result.ok) {
        const updatedEvent = { ...target, sharedMemo: newMemo, sharedMemoVersion: result.newVersion };
        setEvents(events.map(e => String(e.id) === String(eventId) ? updatedEvent : e));
        if (selectedEventForDetail && String(selectedEventForDetail.id) === String(eventId)) setSelectedEventForDetail(updatedEvent);
        return 'saved';
      } else {
        // 충돌: 그 사이 다른 사람이 먼저 저장함 — 최신 내용으로 로컬 상태를 갱신
        // (TS가 이 분기에서 판별 유니언을 안 좁혀줘서 단언으로 우회)
        const conflict = result as { ok: false; latestMemo: string | null; latestVersion: number };
        const updatedEvent = { ...target, sharedMemo: conflict.latestMemo, sharedMemoVersion: conflict.latestVersion };
        setEvents(events.map(e => String(e.id) === String(eventId) ? updatedEvent : e));
        if (selectedEventForDetail && String(selectedEventForDetail.id) === String(eventId)) setSelectedEventForDetail(updatedEvent);
        return 'conflict';
      }
    } catch (err) {
      console.error('Failed to update shared memo:', err);
      return 'error';
    }
  };

  const handleNavigateMonth = (offset: number) => {
    setCurrentCalendarDate(prev => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + offset);
      return next;
    });
  };

  // 강력 새로고침: SW 등록 해제 + 캐시 전부 삭제 후 페이지를 다시 불러와
  // 완전히 새 상태로 시작한다.
  const [isHardRefreshing, setIsHardRefreshing] = useState(false);
  const handleHardRefresh = async () => {
    setIsHardRefreshing(true);
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch (err) {
      console.error('Failed to clear cache before hard refresh:', err);
    } finally {
      window.location.reload();
    }
  };

  // 24시간 이상 만에 다시 접속하면, 캐시가 오래됐을 수 있으니 강력
  // 새로고침을 추천하는 배너를 한 번 띄운다.
  const [showRefreshSuggestion, setShowRefreshSuggestion] = useState(false);
  useEffect(() => {
    const LAST_VISIT_KEY = 'lastVisitAt';
    const SUGGEST_THRESHOLD_MS = 24 * 60 * 60 * 1000;

    const lastVisitAt = Number(localStorage.getItem(LAST_VISIT_KEY));
    if (lastVisitAt && Date.now() - lastVisitAt > SUGGEST_THRESHOLD_MS) {
      setShowRefreshSuggestion(true);
    }
    localStorage.setItem(LAST_VISIT_KEY, String(Date.now()));
  }, []);

  const filteredEvents = events.filter(e => {
    if (isEventDeleted(e)) return false;
    if (selectedLocation && (!e.location || !e.location.trim().includes(selectedLocation))) {
      return false;
    }
    return true;
  });


  return (
    <div className="min-h-screen bg-paper flex justify-center sm:py-10 relative overflow-hidden">

      {/* ── Background blobs ── */}
      <div className="blob w-80 h-80 bg-sage -top-20 -left-24 opacity-90" />
      <div className="blob w-72 h-72 bg-lavender top-1/3 -right-24 opacity-90" style={{ animationDelay: '-2s' }} />
      <div className="blob w-64 h-64 bg-peach/40 bottom-0 left-1/4" style={{ animationDelay: '-4s' }} />

      {/* ── Main App Card ── */}
      <div className="w-full max-w-[448px] flex flex-col min-h-screen sm:min-h-[860px] relative sm:rounded-[3rem] sm:bg-paper/60 sm:shadow-soft-lg sm:backdrop-blur-sm overflow-hidden">

        {/* ── Header ── */}
        <header className="relative px-6 pt-8 pb-4 shrink-0">
          <div className="flex justify-between items-center">
            <span className="font-hand text-[26px] text-muted -rotate-2 inline-block whitespace-nowrap">
              see you underwater ~
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleHardRefresh}
                disabled={isHardRefreshing}
                className={`${iconButton} disabled:opacity-60`}
                title="강력 새로고침 (캐시 지우고 새로 불러오기)"
                aria-label="강력 새로고침"
              >
                <RefreshCw className={`w-4 h-4 ${isHardRefreshing ? 'animate-spin' : ''}`} strokeWidth={2} />
              </button>

              <button
                onClick={handleToggleAdminMode}
                className={`${iconButton} ${isAdminMode ? '!bg-peach !text-ink' : ''}`}
                title={isAdminMode ? '관리자 모드 켜짐 (누르면 해제)' : '관리자 로그인'}
                aria-label={isAdminMode ? '관리자 모드 해제' : '관리자 로그인'}
                aria-pressed={isAdminMode}
              >
                <KeyRound className="w-4 h-4" strokeWidth={2} />
              </button>

              {showInstallButton && (
                <button
                  onClick={handleInstall}
                  className={iconButton}
                  title="홈 화면에 설치"
                  aria-label="홈 화면에 설치"
                >
                  <Download className="w-4 h-4" strokeWidth={2} />
                </button>
              )}
            </div>
          </div>

          <h1 className="mt-3 text-[38px] font-semibold tracking-tight leading-[1.35] text-ink">
            <span className="whitespace-nowrap">
              <span className="underline decoration-peach decoration-[6px] underline-offset-[6px] [text-decoration-skip-ink:none]">양희선</span> 강사
            </span>{' '}
            {/* "수업캘린더"와 아이콘을 한 덩어리로 묶어, 줄이 접혀도 아이콘이 홀로 떨어지지 않게 한다 */}
            <span className="whitespace-nowrap">
              <span className="text-peach-deep text-[30px]">수업캘린더</span>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex align-middle ml-3 -mt-1.5 w-9 h-9 rounded-full bg-white/70 shadow-soft text-ink hover:bg-peach/50 items-center justify-center press"
                title="인스타그램"
                aria-label="인스타그램 열기"
              >
                <Instagram className="w-[18px] h-[18px]" strokeWidth={1.75} />
              </a>
            </span>
          </h1>

          {/* 평소엔 상태 표시를 숨기고, 불러오기 실패·관리자 모드일 때만 보여준다 */}
          {(syncStatus === 'error' || isAdminMode) && (
          <div className="mt-3 flex items-center gap-2">
            {syncStatus === 'error' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-peach/40 text-peach-deep">
                <span className="w-1.5 h-1.5 rounded-full bg-peach-deep" />
                연결 오류
              </span>
            )}
            {isAdminMode && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-peach/50 text-ink animate-fade-up">
                <KeyRound className="w-3 h-3" strokeWidth={2} />
                관리자 모드
              </span>
            )}
          </div>
          )}

        </header>

        {/* ── Scrollable Content ── */}
        <main className="flex-1 overflow-y-auto px-5 py-2 space-y-6 pb-32">
          <CalendarView
            currentDate={currentCalendarDate}
            selectedDate={selectedDate}
            events={filteredEvents}
            onSelectDate={setSelectedDate}
            onNavigateMonth={handleNavigateMonth}
            selectedLocation={selectedLocation}
            onSelectLocation={setSelectedLocation}
          />

          <EventListView
            selectedDate={selectedDate}
            events={filteredEvents}
            isAdminMode={isAdminMode}
            onEditEvent={handleEditEventClick}
            onDeleteEvent={handleDeleteEvent}
            onAddEventClick={openNewEventForm}
            onEventClick={handleOpenEventDetail}
            onSelectDate={setSelectedDate}
          />
        </main>

        {/* ── Floating Add Button (관리자 전용) ── */}
        {isAdminMode && (
          <div className="fixed bottom-7 right-[max(1.5rem,calc(50vw-224px+1.5rem))] z-40 animate-fade-up">
            <button
              onClick={openNewEventForm}
              className="w-16 h-16 bg-peach text-ink rounded-full shadow-soft-lg flex items-center justify-center press cursor-pointer hover:brightness-105"
              title="일정 추가"
              aria-label="일정 추가"
            >
              <Plus className="w-7 h-7" strokeWidth={2} />
            </button>
          </div>
        )}

        {/* ── Event Form Modal ── */}
        {isFormOpen && isAdminMode && (
          <EventForm
            selectedDate={selectedDate || new Date().toISOString().slice(0, 10)}
            editingEvent={editingEvent}
            onSave={handleSaveEvent}
            onCancel={() => { setIsFormOpen(false); setEditingEvent(null); }}
          />
        )}

        {/* ── Event Detail Modal ── */}
        {selectedEventForDetail && (
          <EventDetailModal
            event={selectedEventForDetail}
            isAdminMode={isAdminMode}
            onClose={handleCloseEventDetail}
            onAddAttendee={(nickname, password) => handleAddAttendeeToEvent(selectedEventForDetail.id, nickname, password)}
            onRemoveAttendee={(nickname) => handleRemoveAttendeeFromEvent(selectedEventForDetail.id, nickname)}
            onUpdateSharedMemo={(newMemo, baseVersion) => handleUpdateSharedMemo(selectedEventForDetail.id, newMemo, baseVersion)}
          />
        )}

        {/* ── Sync Loading Overlay ── */}
        {isLoading && syncStatus === 'syncing' && (
          <div className="fixed inset-0 bg-paper/70 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="flex flex-col items-center bg-white/80 px-10 py-9 rounded-[2.5rem] shadow-soft-lg text-center animate-fade-up">
              <div className="relative w-20 h-20 mb-5">
                <div className="absolute inset-0 rounded-full bg-sage animate-float" />
                <div className="absolute inset-0 rounded-full border-2 border-sage-deep/20 border-t-sage-deep animate-spin" />
              </div>
              <p className="font-hand text-3xl text-ink">just a moment…</p>
              <p className="text-xs text-muted mt-2">일정을 불러오고 있어요</p>
            </div>
          </div>
        )}
      </div>

      {/* Global Toast */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-ink text-paper text-sm px-5 py-3 rounded-full shadow-soft-lg z-[150] animate-fade-up whitespace-nowrap">
          {toastMessage}
        </div>
      )}

      {/* 오랜만에 접속 시 강력 새로고침 추천 배너 */}
      {showRefreshSuggestion && (
        <div className="fixed top-4 inset-x-4 z-[150] mx-auto max-w-[416px] animate-fade-up">
          <div className="flex items-center gap-3 bg-white/90 backdrop-blur text-ink rounded-[2rem] shadow-soft-lg px-5 py-4">
            <RefreshCw className="w-4 h-4 shrink-0 text-sage-deep" strokeWidth={2} />
            <p className="flex-1 text-sm leading-snug">
              오랜만이에요! 최신 일정을 위해 새로고침을 추천드려요.
            </p>
            <button
              onClick={() => { setShowRefreshSuggestion(false); handleHardRefresh(); }}
              className="px-4 py-2 bg-ink text-paper text-xs font-medium rounded-full shrink-0 cursor-pointer press"
            >
              새로고침
            </button>
            <button
              onClick={() => setShowRefreshSuggestion(false)}
              className="shrink-0 cursor-pointer text-muted"
              title="닫기"
              aria-label="닫기"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      )}

      {/* Paper grain */}
      <div className="grain" aria-hidden="true" />
    </div>
  );
}
