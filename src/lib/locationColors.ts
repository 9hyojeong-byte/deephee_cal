// 장소별 색상. 파스텔 배경 위에서도 구분되도록 채도를 살짝 남긴 톤.
export const LOCATION_COLORS = {
  '딥스': {
    bg: 'bg-[#7BA4C7]',
    soft: 'bg-[#E6EEF5]',
    text: 'text-[#4F7699]',
    border: 'border-[#7BA4C7]',
    hoverBorder: 'hover:border-[#7BA4C7]',
    hoverText: 'hover:text-[#4F7699]',
  },
  '성남': {
    bg: 'bg-[#86B08F]',
    soft: 'bg-sage',
    text: 'text-sage-deep',
    border: 'border-[#86B08F]',
    hoverBorder: 'hover:border-[#86B08F]',
    hoverText: 'hover:text-sage-deep',
  },
  '파라': {
    bg: 'bg-[#F2918A]',
    soft: 'bg-[#FDECEA]',
    text: 'text-peach-deep',
    border: 'border-[#F2918A]',
    hoverBorder: 'hover:border-[#F2918A]',
    hoverText: 'hover:text-peach-deep',
  },
  '수원': {
    bg: 'bg-[#DDAA5E]',
    soft: 'bg-[#F7EEDD]',
    text: 'text-[#9A6F2C]',
    border: 'border-[#DDAA5E]',
    hoverBorder: 'hover:border-[#DDAA5E]',
    hoverText: 'hover:text-[#9A6F2C]',
  },
  '자유일정': {
    bg: 'bg-[#9C8FC4]',
    soft: 'bg-lavender',
    text: 'text-lavender-deep',
    border: 'border-[#9C8FC4]',
    hoverBorder: 'hover:border-[#9C8FC4]',
    hoverText: 'hover:text-lavender-deep',
  },
} as const;

export type LocationKey = keyof typeof LOCATION_COLORS;

// 홈 화면 장소 목록에서 숨기는 장소. 희선강사는 파라다이브를 이용하지 않는다.
// 색상은 남겨둬서 혹시 남아 있는 파라 일정의 점 색은 그대로 보인다.
export const HIDDEN_LOCATIONS: readonly string[] = ['파라'];

function findLocationKey(location: string | null | undefined): LocationKey | null {
  if (!location) return null;
  const trimmed = location.trim();
  for (const key of Object.keys(LOCATION_COLORS) as LocationKey[]) {
    if (trimmed.includes(key)) return key;
  }
  return null;
}

export function getDotColorClass(location: string | null | undefined): string {
  const key = findLocationKey(location);
  return key ? LOCATION_COLORS[key].bg : 'bg-stone-300';
}

export function getLocationTone(location: string | null | undefined): { soft: string; text: string } {
  const key = findLocationKey(location);
  return key
    ? { soft: LOCATION_COLORS[key].soft, text: LOCATION_COLORS[key].text }
    : { soft: 'bg-stone-100', text: 'text-muted' };
}
