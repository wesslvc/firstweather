// 기상청 특보 종류 (11종) — 각 종류별 기준색, 주의보/경보는 명도 차이로 구분
export interface WarningType {
  key: string;    // 통보문 텍스트에 등장하는 접두어 (예: "강풍" in "강풍주의보")
  label: string;  // 화면 표시명
  color: string;  // 기준색 (경보 단계에 그대로 사용)
}

export const WARNING_TYPES: WarningType[] = [
  { key: '강풍',   label: '강풍',   color: '#3b82f6' },
  { key: '풍랑',   label: '풍랑',   color: '#06b6d4' },
  { key: '호우',   label: '호우',   color: '#2563eb' },
  { key: '대설',   label: '대설',   color: '#7c3aed' },
  { key: '건조',   label: '건조',   color: '#b45309' },
  { key: '폭풍해일', label: '폭풍해일', color: '#1e3a8a' },
  { key: '지진해일', label: '지진해일', color: '#991b1b' },
  { key: '태풍',   label: '태풍',   color: '#dc2626' },
  { key: '한파',   label: '한파',   color: '#0891b2' },
  { key: '폭염',   label: '폭염',   color: '#db2777' },
  { key: '황사',   label: '황사',   color: '#ca8a04' },
];

export type WarningLevel = '주의보' | '경보';

// hex 색상을 흰색과 섞어 밝게(주의보용 톤) 만든다
export function tint(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

export function colorForLevel(baseColor: string, level: WarningLevel): string {
  return level === '경보' ? baseColor : tint(baseColor, 0.55);
}

export function findWarningType(name: string): WarningType | null {
  return WARNING_TYPES.find((t) => name.startsWith(t.key)) ?? null;
}
