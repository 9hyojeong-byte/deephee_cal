import { ClassType } from '../types';

// 수업 종류별 배지 색상. 디자인 토큰(피치/세이지/라벤더)에 맞춘다.
export const CLASS_TYPE_TONES: Record<ClassType, { soft: string; text: string; dot: string }> = {
  '머메이드': { soft: 'bg-[#FDECEA]', text: 'text-peach-deep', dot: 'bg-peach' },
  '프리다이빙': { soft: 'bg-sage', text: 'text-sage-deep', dot: 'bg-[#86B08F]' },
  '연습': { soft: 'bg-lavender', text: 'text-lavender-deep', dot: 'bg-[#9C8FC4]' },
  '개인일정': { soft: 'bg-stone-100', text: 'text-muted', dot: 'bg-stone-400' },
};
