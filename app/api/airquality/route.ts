import { NextRequest, NextResponse } from 'next/server';
import { MOCK_AIR_QUALITY } from '@/lib/mockData';
import type { AirQualityData } from '@/lib/types';

const BASE_URL =
  'http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const apiKey = process.env.AIRKOREA_API_KEY;
  const { searchParams } = new URL(request.url);
  const stationName = searchParams.get('station') ?? '중구';

  if (!apiKey) {
    return NextResponse.json({ data: MOCK_AIR_QUALITY, mock: true });
  }

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

    if (!res.ok) throw new Error(`에어코리아 API 오류: ${res.status}`);

    const json = await res.json();
    const item = json?.response?.body?.items?.[0];
    if (!item) throw new Error('데이터 없음');

    const data: AirQualityData = {
      stationName: item.stationName ?? stationName,
      pm10Value: item.pm10Value ?? '-',
      pm25Value: item.pm25Value ?? '-',
      pm10Grade: item.pm10Grade ?? '-',
      pm25Grade: item.pm25Grade ?? '-',
      o3Value: item.o3Value ?? '-',
      coValue: item.coValue ?? '-',
      dataTime: item.dataTime ?? '-',
    };

    return NextResponse.json({ data, mock: false });
  } catch (e) {
    console.error('Air quality API error:', e);
    return NextResponse.json({ data: MOCK_AIR_QUALITY, mock: true, error: String(e) });
  }
}
