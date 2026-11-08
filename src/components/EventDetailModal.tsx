import React, { useState, useEffect } from 'react';
import { X, Clock, MapPin, AlignLeft, Users, UserPlus, Sparkles, Link, Waves, MessageSquare } from 'lucide-react';
import { ScheduleEvent } from '../types';
import { getAttendeesList, getParticipantsList } from '../lib/authors';
import { linkifyText } from '../lib/linkify';
import { getLocationTone } from '../lib/locationColors';
import { CLASS_TYPE_TONES } from '../lib/classTypes';
import { SHARE_LABEL } from '../lib/appConfig';
import { formatKoreanDate, getEventTimeLabel } from '../lib/eventLabel';

interface EventDetailModalProps {
  event: ScheduleEvent;
  isAdminMode: boolean;
  onClose: () => void;
  onAddAttendee: (nickname: string, password?: string) => void;
  onRemoveAttendee: (nickname: string) => void;
  onUpdateSharedMemo: (newMemo: string, baseVersion: number) => Promise<'saved' | 'conflict' | 'error'>;
}

const sectionLabel = 'text-sm text-muted flex items-center gap-1.5 px-1';
const pill = 'flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm';
const softInput =
  'w-full px-5 py-3 border border-line bg-white rounded-full text-sm text-ink input-soft placeholder:text-muted/60';

export default function EventDetailModal({ event, isAdminMode, onClose, onAddAttendee, onRemoveAttendee, onUpdateSharedMemo }: EventDetailModalProps) {
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savedMyName, setSavedMyName] = useState('');
  const [savedMyPassword, setSavedMyPassword] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [isEditingMemo, setIsEditingMemo] = useState(false);
  const [memoDraft, setMemoDraft] = useState('');
  const [memoBaseVersion, setMemoBaseVersion] = useState(0);
  const [isSavingMemo, setIsSavingMemo] = useState(false);

  // 작성자는 화면·공유 문구에 드러내지 않고, 실제 참석자만 보여준다.
  const attendees = getAttendeesList(event.attendees);
  const participants = getParticipantsList(event.attendees);
  const tone = getLocationTone(event.location);
  const dateLabel = event.endDate
    ? `${formatKoreanDate(event.date, true)} ~ ${formatKoreanDate(event.endDate, true)}`
    : formatKoreanDate(event.date, true);
  const timeLabel = getEventTimeLabel(event);

  const handleCopyLink = async () => {
    const deepTankText = event.deepTankUsage ? `, 딥탱크: ${event.deepTankUsage}` : '';
    const locationText = event.location || '일반';
    const url = `${window.location.origin}${window.location.pathname}?scheduleId=${event.id}`;

    const attendeesText = participants.length > 0
      ? `${participants.join(', ')} (${participants.length}명)`
      : '없음';

    const textToCopy = `📅 [${SHARE_LABEL}]
• 일시: ${dateLabel} (${timeLabel}${deepTankText})
• 장소: ${locationText}
${event.classType ? `• 수업: ${event.classType}\n` : ''}• 메모: ${event.description || '-'}
• 참석자: ${attendeesText}
🔗 링크: ${url}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      alert('링크 복사에 실패했습니다.');
    }
  };

  useEffect(() => {
    const cachedName = localStorage.getItem('lastAttendeeName') || '';
    const cachedPassword = localStorage.getItem('lastAttendeePassword') || '';
    setSavedMyName(cachedName);
    setSavedMyPassword(cachedPassword);
    if (cachedName) setNewName(cachedName);
    if (cachedPassword) setNewPassword(cachedPassword);
  }, []);

  const handleAddAttendee = (name: string, password: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (attendees.includes(trimmed)) { alert('이미 등록된 참석자입니다.'); return; }
    const trimmedPassword = password.trim();
    localStorage.setItem('lastAttendeeName', trimmed);
    if (trimmedPassword) localStorage.setItem('lastAttendeePassword', trimmedPassword);
    setSavedMyName(trimmed);
    setSavedMyPassword(trimmedPassword);
    onAddAttendee(trimmed, trimmedPassword || undefined);
    setNewName('');
  };

  const handleRemoveAttendee = (name: string) => {
    const message = isAdminMode
      ? `[관리자] "${name}" 님을 참석자에서 제외할까요?`
      : `"${name}" 님을 참석자에서 제외하시겠습니까?`;
    if (!window.confirm(message)) return;
    onRemoveAttendee(name);
  };

  const handleStartEditMemo = () => {
    setMemoDraft(event.sharedMemo || '');
    setMemoBaseVersion(event.sharedMemoVersion ?? 0);
    setIsEditingMemo(true);
  };

  const handleSaveMemo = async () => {
    setIsSavingMemo(true);
    const result = await onUpdateSharedMemo(memoDraft, memoBaseVersion);
    setIsSavingMemo(false);
    setIsEditingMemo(false);
    if (result === 'conflict') {
      alert('다른 분이 방금 먼저 저장했어요. 최신 내용으로 다시 불러왔습니다. 필요하면 다시 수정해주세요.');
    } else if (result === 'error') {
      alert('메모 저장 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/20 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md">
      <div className="bg-paper rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-soft-lg flex flex-col max-h-[92vh] animate-sheet-up relative">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2 shrink-0">
          <span className={`${pill} ${tone.soft} ${tone.text} font-medium`}>
            <MapPin className="w-4 h-4" strokeWidth={1.75} />
            {event.location || '일반'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              type="button"
              className="w-10 h-10 rounded-full bg-white shadow-soft hover:bg-lavender flex items-center justify-center press cursor-pointer"
              title="링크 복사"
              aria-label="링크 복사"
            >
              <Link className="w-4 h-4 text-ink" strokeWidth={1.75} />
            </button>
            <button
              onClick={onClose}
              type="button"
              className="w-10 h-10 rounded-full bg-white shadow-soft hover:bg-lavender flex items-center justify-center press cursor-pointer"
              aria-label="닫기"
            >
              <X className="w-4 h-4 text-ink" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-3 space-y-6">

          {/* Heading: 이 앱은 일정 제목(작성자명 포함)을 보여주지 않고 날짜를 제목처럼 쓴다 */}
          <div className="space-y-3">
            <h2 className="text-[30px] font-semibold tracking-tight leading-tight text-ink">
              {dateLabel}
            </h2>
            <div className="flex flex-wrap gap-2">
              {event.classType && (
                <div className={`${pill} ${CLASS_TYPE_TONES[event.classType].soft} ${CLASS_TYPE_TONES[event.classType].text}`}>
                  <span className={`w-2 h-2 rounded-full ${CLASS_TYPE_TONES[event.classType].dot}`} />
                  <span>{event.classType}</span>
                </div>
              )}
              <div className={`${pill} bg-white text-ink shadow-soft`}>
                <Clock className="w-4 h-4 text-muted" strokeWidth={1.75} />
                <span>{timeLabel}</span>
              </div>
              {event.deepTankUsage && (
                <div className={`${pill} bg-lavender text-lavender-deep`}>
                  <Waves className="w-4 h-4" strokeWidth={1.75} />
                  <span>딥탱크 {event.deepTankUsage}</span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="space-y-2">
              <label className={sectionLabel}>
                <AlignLeft className="w-4 h-4" strokeWidth={1.75} />메모
              </label>
              <div className="bg-white p-5 rounded-[2rem] shadow-soft text-[15px] text-ink leading-relaxed break-all whitespace-pre-line">
                {linkifyText(event.description)}
              </div>
            </div>
          )}

          {/* Shared Memo - 비밀번호 없이 누구나 쓰는 메모 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={sectionLabel}>
                <MessageSquare className="w-4 h-4" strokeWidth={1.75} />공유 메모 · 누구나 작성 가능
              </label>
              {!isEditingMemo && (
                <button
                  type="button"
                  onClick={handleStartEditMemo}
                  className="text-sm text-peach-deep hover:underline cursor-pointer px-1"
                >
                  {event.sharedMemo ? '수정' : '작성하기'}
                </button>
              )}
            </div>

            {isEditingMemo ? (
              <div className="space-y-2">
                <textarea
                  value={memoDraft}
                  onChange={(e) => setMemoDraft(e.target.value)}
                  rows={4}
                  placeholder="다 같이 볼 수 있는 메모를 자유롭게 남겨보세요"
                  className="w-full px-5 py-4 border border-line bg-white rounded-[1.75rem] text-[15px] text-ink input-soft resize-none placeholder:text-muted/60"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingMemo(false)}
                    className="flex-1 py-3 bg-white border border-line text-muted text-sm rounded-full press cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveMemo}
                    disabled={isSavingMemo}
                    className="flex-1 py-3 bg-ink text-paper font-medium text-sm rounded-full press cursor-pointer disabled:opacity-60"
                  >
                    {isSavingMemo ? '저장 중…' : '저장'}
                  </button>
                </div>
              </div>
            ) : event.sharedMemo ? (
              <div className="bg-sage/70 p-5 rounded-[2rem] text-[15px] text-ink leading-relaxed break-all whitespace-pre-line">
                {linkifyText(event.sharedMemo)}
              </div>
            ) : (
              <div className="text-center py-6 rounded-[2rem] border border-dashed border-stone-300">
                <p className="text-sm text-muted">아직 작성된 공유 메모가 없어요</p>
              </div>
            )}
          </div>

          {/* Attendees */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className={sectionLabel}>
                <Users className="w-4 h-4" strokeWidth={1.75} />참석자
              </label>
              <span className="min-w-6 h-6 px-2 bg-sage text-sage-deep text-xs font-medium rounded-full inline-flex items-center justify-center">
                {participants.length}
              </span>
            </div>

            {participants.length === 0 ? (
              <div className="text-center py-7 rounded-[2rem] border border-dashed border-stone-300">
                <p className="font-hand text-2xl text-ink">be the first one</p>
                <p className="text-sm text-muted mt-1">가장 먼저 참석 등록을 해보세요</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 bg-white p-4 rounded-[2rem] shadow-soft">
                {participants.map((name) => (
                  <button
                    key={name}
                    onClick={() => handleRemoveAttendee(name)}
                    className={`${pill} bg-lavender text-lavender-deep transition group cursor-pointer hover:bg-peach/40 hover:text-peach-deep`}
                    title="참석 취소"
                  >
                    <span>{name}</span>
                    <X className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition" strokeWidth={2} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Add Attendee */}
          <div className="space-y-3 bg-lavender/70 p-5 rounded-[2rem]">
            <label className="text-sm text-lavender-deep flex items-center gap-1.5">
              <UserPlus className="w-4 h-4" strokeWidth={1.75} />참석 등록
            </label>

            <div className="flex gap-2">
              <input
                type="text"
                maxLength={10}
                placeholder="이름 (예: 길동)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); handleAddAttendee(newName, newPassword); }}}
                className={`${softInput} flex-1`}
              />
              <button
                type="button"
                onClick={() => handleAddAttendee(newName, newPassword)}
                className="px-5 py-3 bg-ink text-paper font-medium text-sm rounded-full press cursor-pointer shrink-0"
              >
                등록
              </button>
            </div>

            <input
              type="password"
              maxLength={20}
              placeholder="비밀번호 (선택, 본인 참석 취소 시 필요)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); handleAddAttendee(newName, newPassword); }}}
              className={softInput}
            />

            {savedMyName && !attendees.includes(savedMyName) && (
              <button
                type="button"
                onClick={() => handleAddAttendee(savedMyName, savedMyPassword)}
                className="text-sm text-lavender-deep hover:text-ink flex items-center gap-1.5 transition cursor-pointer px-1"
              >
                <Sparkles className="w-4 h-4" strokeWidth={1.75} />
                <span>'{savedMyName}'(으)로 바로 참석</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-4 bg-ink text-paper font-medium text-[15px] rounded-full press cursor-pointer"
          >
            확인
          </button>
        </div>

        {/* Copy Link Toast Notification */}
        {showToast && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-ink text-paper text-sm px-5 py-3 rounded-full shadow-soft-lg z-[60] animate-fade-up whitespace-nowrap">
            일정 링크가 복사되었어요 🔗
          </div>
        )}
      </div>
    </div>
  );
}
