import { NextRequest, NextResponse } from 'next/server';
import type { AirQualityData } from '@/lib/types';

const BASE_URL = 'http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty';
const NO_CACHE_HEADERS = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export const dynamic = 'force-dynamic';

function nullIfDash(v: string | undefined | null): string | null {
  if (!v || v === '-' || v === '') return null;
  return v;
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.AIRKOREA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API 키가 설정되지 않았습니다.' }, { status: 503, headers: NO_CACHE_HEADERS });
  }

  const { searchParams } = new URL(request.url);
  const stationName = searchParams.get('station') ?? '중구';

  try {
    const params = new URLSearchParams({
      serviceKey: apiKey,
      returnType: 'json',
      numOfRows: '1',
      pageNo: '1',
      stationName,
      dataTerm: 'DAILY',
      ver: '1.3',
    });

    const res = await fetch(`${BASE_URL}?${params}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`에어코리아 API ${res.status}`);

    const json = await res.json();
    const item = json?.response?.body?.items?.[0];
    if (!item) throw new Error('측정 데이터 없음');

    const data: AirQualityData = {
      stationName:  item.stationName  ?? stationName,
      dataTime:     item.dataTime     ?? '',
      pm10Value:    nullIfDash(item.pm10Value),
      pm25Value:    nullIfDash(item.pm25Value),
      pm10Grade:    nullIfDash(item.pm10Grade),
      pm25Grade:    nullIfDash(item.pm25Grade),
      o3Value:      nullIfDash(item.o3Value),
      o3Grade:      nullIfDash(item.o3Grade),
      no2Value:     nullIfDash(item.no2Value),
      no2Grade:     nullIfDash(item.no2Grade),
      so2Value:     nullIfDash(item.so2Value),
      so2Grade:     nullIfDash(item.so2Grade),
      coValue:      nullIfDash(item.coValue),
      coGrade:      nullIfDash(item.coGrade),
      khaiValue:    nullIfDash(item.khaiValue),
      khaiGrade:    nullIfDash(item.khaiGrade),
    };

    return NextResponse.json({ data }, { headers: NO_CACHE_HEADERS });
  } catch (e) {
    console.error('Air quality API error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
