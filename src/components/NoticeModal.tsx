import React, { useEffect, useState } from 'react';
import { X, Megaphone, Pencil } from 'lucide-react';
import { fetchNotice, saveNotice, AppNotice } from '../lib/supabaseApi';
import { linkifyText } from '../lib/linkify';

interface NoticeModalProps {
  isAdminMode: boolean;
  onClose: () => void;
}

function formatUpdatedAt(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} 수정`;
}

// "공지사항 및 사용방법" 레이어 팝업. 누구나 읽을 수 있고, 관리자 모드에서만 수정할 수 있다.
export default function NoticeModal({ isAdminMode, onClose }: NoticeModalProps) {
  const [notice, setNotice] = useState<AppNotice | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchNotice()
      .then((n) => { if (!cancelled) setNotice(n); })
      .catch((err) => { console.error('공지 불러오기 실패:', err); if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, []);

  // 관리자 모드가 꺼지면 편집 상태도 닫는다.
  useEffect(() => {
    if (!isAdminMode) setIsEditing(false);
  }, [isAdminMode]);

  const startEdit = () => {
    setDraft(notice?.content ?? '');
    setSaveError(false);
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(false);
    try {
      const saved = await saveNotice(draft.trim());
      setNotice(saved);
      setIsEditing(false);
    } catch (err) {
      console.error('공지 저장 실패:', err);
      setSaveError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = !notice && !loadError;
  const content = notice?.content ?? '';

  return (
    <div
      className="fixed inset-0 bg-ink/20 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md"
      onClick={() => { if (!isEditing) onClose(); }}
    >
      <div
        className="bg-paper rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-soft-lg flex flex-col max-h-[92vh] animate-sheet-up relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2 shrink-0">
          <span className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm bg-peach/50 text-ink font-medium">
            <Megaphone className="w-4 h-4" strokeWidth={1.75} />
            공지사항 및 사용방법
          </span>
          <div className="flex items-center gap-2">
            {isAdminMode && !isEditing && notice && (
              <button
                onClick={startEdit}
                type="button"
                className="w-10 h-10 rounded-full bg-white shadow-soft hover:bg-lavender flex items-center justify-center press cursor-pointer"
                title="공지 수정"
                aria-label="공지 수정"
              >
                <Pencil className="w-4 h-4 text-ink" strokeWidth={1.75} />
              </button>
            )}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-3">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={14}
                autoFocus
                placeholder="공지사항이나 사용방법을 적어주세요. 줄바꿈과 이모지가 그대로 보여요."
                className="w-full px-5 py-4 border border-line bg-white rounded-3xl text-[15px] leading-relaxed text-ink input-soft placeholder:text-muted/60 resize-none"
              />
              {saveError && (
                <p className="text-sm text-peach-deep px-1">저장하지 못했어요. 잠시 후 다시 시도해주세요.</p>
              )}
            </div>
          ) : isLoading ? (
            <p className="text-sm text-muted py-8 text-center">불러오는 중…</p>
          ) : loadError ? (
            <p className="text-sm text-peach-deep py-8 text-center">공지를 불러오지 못했어요.</p>
          ) : content ? (
            <div className="space-y-3">
              <div className="bg-white rounded-3xl px-5 py-4 shadow-soft text-[15px] leading-relaxed text-ink whitespace-pre-wrap break-words">
                {linkifyText(content)}
              </div>
              {notice?.updatedAt && (
                <p className="text-xs text-muted text-right px-1">{formatUpdatedAt(notice.updatedAt)}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted py-8 text-center">아직 등록된 공지가 없어요.</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 shrink-0">
          {isEditing ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="flex-1 py-4 bg-white text-ink font-medium text-[15px] rounded-full shadow-soft press cursor-pointer disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-4 bg-ink text-paper font-medium text-[15px] rounded-full press cursor-pointer disabled:opacity-50"
              >
                {isSaving ? '저장 중…' : '저장'}
              </button>
            </div>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-4 bg-ink text-paper font-medium text-[15px] rounded-full press cursor-pointer"
            >
              확인
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
