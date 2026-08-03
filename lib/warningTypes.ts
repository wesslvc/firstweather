// 기상청 특보 현황판 색상 코드 기준
export interface WarningType {
  code: string;   // 기상청 특보 코드 (C, D, F, H, ...)
  key: string;    // 통보문 텍스트에 등장하는 접두어 (예: "강풍" in "강풍주의보")
  label: string;  // 화면 표시명
  color: string;  // 기준색 (경보 단계에 그대로 사용)
}

export const CLEARED_COLOR = 'rgb(220,220,220)'; // 코드 "3" 해제

// API 라우트와 클라이언트가 공유하는 응답 타입.
// 클라이언트 컴포넌트가 서버 전용 라우트 파일을 import 하지 않도록 여기에 둔다.
export interface WarningEntry {
  label: string;             // 예: "폭염경보", "폭염중대경보"
  typeKey: string;           // 예: "폭염"
  level: WarningLevel;
  areaText: string;          // 원문 지역 설명
  districts: string[];       // 매칭된 시/군/구 SVG id 목록
  provinces: string[];       // districts가 속한 시/도 id 목록 (중복 제거)
}

export const WARNING_TYPES: WarningType[] = [
  { code: 'W', key: '강풍',   label: '강풍',   color: 'rgb(0,240,0)' },
  { code: 'V', key: '풍랑',   label: '풍랑',   color: 'rgb(0,255,255)' },
  { code: 'R', key: '호우',   label: '호우',   color: 'rgb(0,0,255)' },
  { code: 'S', key: '대설',   label: '대설',   color: 'rgb(255,0,255)' },
  { code: 'D', key: '건조',   label: '건조',   color: 'rgb(255,127,0)' },
  { code: 'O', key: '폭풍해일', label: '폭풍해일', color: 'rgb(195,192,145)' },
  { code: 'N', key: '지진해일', label: '지진해일', color: 'rgb(195,150,100)' },
  { code: 'T', key: '태풍',   label: '태풍',   color: 'rgb(255,0,0)' },
  { code: 'C', key: '한파',   label: '한파',   color: 'rgb(0,127,255)' },
  { code: 'H', key: '폭염',   label: '폭염',   color: 'rgb(195,0,195)' },
  { code: 'Y', key: '황사',   label: '황사',   color: 'rgb(255,255,0)' },
  { code: 'F', key: '안개',   label: '안개',   color: 'rgb(128,20,10)' },
  { code: 'K', key: '열대야', label: '열대야', color: 'rgb(213,255,85)' },
];

// 폭염 등 일부 특보는 경보 위에 "중대경보" 단계가 추가로 존재
export type WarningLevel = '주의보' | '경보' | '중대경보' | '특보';

export const LEVEL_ORDER: Record<WarningLevel, number> = {
  주의보: 0,
  특보: 1,
  경보: 2,
  중대경보: 3,
};

// rgb(r,g,b) 문자열을 흰색과 섞어 밝게(주의보용 톤) 만든다
export function tint(rgb: string, amount: number): string {
  const m = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return rgb;
  const [r, g, b] = [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

// rgb(r,g,b) 문자열을 검정과 섞어 어둡게(중대경보용 톤) 만든다
export function shade(rgb: string, amount: number): string {
  const m = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return rgb;
  const [r, g, b] = [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
  const mix = (c: number) => Math.round(c * (1 - amount));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

export function colorForLevel(baseColor: string, level: WarningLevel): string {
  if (level === '주의보') return tint(baseColor, 0.5);
  if (level === '중대경보') return shade(baseColor, 0.35);
  return baseColor;
}

export function findWarningType(name: string): WarningType | null {
  return WARNING_TYPES.find((t) => name.startsWith(t.key)) ?? null;
}

export function warningTypeByKey(key: string): WarningType | undefined {
  return WARNING_TYPES.find((t) => t.key === key);
}
