import { NextResponse } from 'next/server';
import { findProvinceForAreaName } from '@/lib/regionMap';
import { findWarningType, type WarningLevel } from '@/lib/warningTypes';

const BASE_URL = 'http://apis.data.go.kr/1360000/WthrWrnInfoService/getPwnStatus';
const NO_CACHE_HEADERS = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export const dynamic = 'force-dynamic';

export interface WarningEntry {
  label: string;             // 예: "폭염경보", "폭염중대경보"
  typeKey: string;           // 예: "폭염"
  level: WarningLevel;
  areaText: string;          // 원문 지역 설명
  provinces: string[];       // 매칭된 시/도 SVG id 목록
}

// 통보문 항목은 보통 "XX주의보"/"XX경보" 형태지만, 열대야처럼 단계 구분 없이
// 이름만 나오는 항목도 있어 둘 다 매칭
function parseT6(raw: string): Array<{ label: string; areaText: string }> {
  const normalized = (' ' + raw).replace(/\s+/g, ' ').trim();
  const entryRegex =
    /o\s*(열대야|[가-힣]{1,8}(?:주의보|경보))\s*[:：]\s*(.*?)(?=\s*o\s*(?:열대야|[가-힣]{1,8}(?:주의보|경보))\s*[:：]|\s*o\s*없음|$)/g;
  const entries: Array<{ label: string; areaText: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = entryRegex.exec(normalized)) !== null) {
    entries.push({ label: m[1], areaText: m[2].trim() });
  }
  return entries;
}

function tokenizeAreaText(areaText: string): string[] {
  const parenContents = [...areaText.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]);
  const withoutParens = areaText.replace(/\([^)]*\)/g, '');
  const raw = [withoutParens, ...parenContents].join(',');
  return raw
    .split(/[,.]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function GET() {
  const apiKey = process.env.KMA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'API 키가 설정되지 않았습니다.' },
      { status: 503, headers: NO_CACHE_HEADERS }
    );
  }

  try {
    const params = new URLSearchParams({
      serviceKey: apiKey,
      dataType: 'JSON',
      numOfRows: '10',
      pageNo: '1',
    });

    // KMA 서버가 응답하지 않을 때 무한 대기하지 않도록 타임아웃 설정
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}?${params}`, { cache: 'no-store', signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) throw new Error(`기상특보 API ${res.status}`);

    const json = await res.json();
    const item = json?.response?.body?.items?.item?.[0];
    if (!item) throw new Error('특보 현황 데이터 없음');

    const t6: string = item.t6 ?? '';
    const tmFc: string = item.tmFc ?? '';
    const tmEf: string = item.tmEf ?? '';

    const entries: WarningEntry[] = [];
    if (!/^\s*o?\s*없음\s*$/.test(t6)) {
      for (const { label, areaText } of parseT6(t6)) {
        const type = findWarningType(label);
        if (!type) continue;
        const level: WarningLevel = label.endsWith('중대경보')
          ? '중대경보'
          : label.endsWith('경보')
            ? '경보'
            : label.endsWith('주의보')
              ? '주의보'
              : '특보';

        const provinceSet = new Set<string>();
        for (const token of tokenizeAreaText(areaText)) {
          const province = findProvinceForAreaName(token);
          if (province) provinceSet.add(province);
        }

        entries.push({
          label,
          typeKey: type.key,
          level,
          areaText,
          provinces: [...provinceSet],
        });
      }
    }

    return NextResponse.json(
      { data: { tmFc, tmEf, t6, entries } },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (e) {
    console.error('Warning API error:', e);
    const message = e instanceof Error && e.name === 'AbortError'
      ? '기상청 서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.'
      : String(e);
    return NextResponse.json({ error: message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
