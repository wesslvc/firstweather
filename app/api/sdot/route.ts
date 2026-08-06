import { NextRequest, NextResponse } from 'next/server';

const BASE = 'http://openapi.seoul.go.kr:8088';
const SERVICE = 'sDoTEnv';
const NO_CACHE_HEADERS = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export const dynamic = 'force-dynamic';

export interface SdotReading {
  serial: string;
  sensingTime: string;
  region: string;
  autonomousDistrict: string;
  administrativeDistrict: string;
  date: string;
  dataNo: string;
  metrics: Record<string, { min: string | null; avg: string | null; max: string | null }>;
}

// 화면에 보여줄 항목: [키, 표시명, 단위]
export const SDOT_METRICS: Array<[string, string, string]> = [
  ['TEMP', '기온', '°C'],
  ['HUMI', '습도', '%'],
  ['WIND_SPEED', '풍속', 'm/s'],
  ['NOISE', '소음', 'dB'],
  ['ULTRA_RAYS', '자외선', ''],
  ['INTE_ILLU', '조도', 'lx'],
  ['EFFE_TEMP', '흑구온도', '°C'],
  ['O3', '오존', 'ppm'],
  ['NO2', '이산화질소', 'ppm'],
  ['CO', '일산화탄소', 'ppm'],
  ['SO2', '이산화황', 'ppm'],
  ['NH3', '암모니아', 'ppm'],
  ['H2S', '황화수소', 'ppm'],
];

function pick(row: Record<string, unknown>, key: string): string | null {
  const v = row[key];
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { cache: 'no-store', signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.SDOT_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'S-DoT API 키(SDOT_API_KEY)가 설정되지 않았습니다.' },
      { status: 503, headers: NO_CACHE_HEADERS }
    );
  }

  const serial = request.nextUrl.searchParams.get('serial')?.trim();
  if (!serial) {
    return NextResponse.json({ error: '시리얼을 지정해 주세요.' }, { status: 400, headers: NO_CACHE_HEADERS });
  }

  try {
    // 이 API는 시리얼로 직접 필터링할 수 없어(START/END 인덱스 페이징만 지원)
    // 최신 구간을 넉넉히 받아 온 뒤 시리얼로 골라낸다.
    const url = `${BASE}/${encodeURIComponent(apiKey)}/json/${SERVICE}/1/1000/`;
    const res = await fetchWithTimeout(url, 8000);
    if (!res.ok) throw new Error(`S-DoT API HTTP ${res.status}`);

    const text = await res.text();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`S-DoT API가 JSON이 아닌 응답을 반환했습니다: ${text.slice(0, 200)}`);
    }

    const body = json?.[SERVICE];
    const code = body?.RESULT?.CODE ?? json?.RESULT?.CODE;
    const message = body?.RESULT?.MESSAGE ?? json?.RESULT?.MESSAGE;
    if (code && !['INFO-000'].includes(String(code))) {
      throw new Error(`S-DoT API 오류 (${code}): ${message ?? '알 수 없는 오류'}`);
    }

    const rowsRaw = body?.row;
    const rows: Array<Record<string, unknown>> = Array.isArray(rowsRaw) ? rowsRaw : rowsRaw ? [rowsRaw] : [];

    const target = serial.toUpperCase();
    const matched = rows.filter((r) => String(r.SERIAL ?? '').trim().toUpperCase() === target);

    if (matched.length === 0) {
      return NextResponse.json(
        {
          error: '최근 수집분에서 이 센서의 자료를 찾지 못했습니다. 잠시 후 다시 시도하거나 다른 센서를 선택해 주세요.',
          scanned: rows.length,
        },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    // 같은 시각 자료가 여럿이면 DATA_NO 2(지연 보정)가 최종값이므로 우선한다.
    matched.sort((a, b) => {
      const t = String(b.SENSING_TIME ?? '').localeCompare(String(a.SENSING_TIME ?? ''));
      if (t !== 0) return t;
      return Number(b.DATA_NO ?? 0) - Number(a.DATA_NO ?? 0);
    });
    const row = matched[0];

    const metrics: SdotReading['metrics'] = {};
    for (const [key] of SDOT_METRICS) {
      const min = pick(row, `MIN_${key}`);
      const avg = pick(row, `AVG_${key}`);
      const max = pick(row, `MAX_${key}`);
      if (min !== null || avg !== null || max !== null) metrics[key] = { min, avg, max };
    }

    const data: SdotReading = {
      serial: String(row.SERIAL ?? serial),
      sensingTime: String(row.SENSING_TIME ?? ''),
      region: String(row.REGION ?? ''),
      autonomousDistrict: String(row.AUTONOMOUS_DISTRICT ?? ''),
      administrativeDistrict: String(row.ADMINISTRATIVE_DISTRICT ?? ''),
      date: String(row.DATE ?? ''),
      dataNo: String(row.DATA_NO ?? ''),
      metrics,
    };

    return NextResponse.json({ data }, { headers: NO_CACHE_HEADERS });
  } catch (e) {
    console.error('S-DoT API error:', e);
    const msg =
      e instanceof Error && e.name === 'AbortError'
        ? '서울 열린데이터광장 응답이 지연되고 있습니다. 다시 시도해 주세요.'
        : e instanceof Error
          ? e.message
          : String(e);
    return NextResponse.json({ error: msg }, { status: 502, headers: NO_CACHE_HEADERS });
  }
}
