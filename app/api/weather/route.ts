import { NextRequest, NextResponse } from 'next/server';
import { MOCK_WEATHER } from '@/lib/mockData';
import type { WeatherData } from '@/lib/types';

const BASE_URL = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst';

function getKSTBaseDateTime(): { date: string; time: string } {
  // 서버는 UTC로 동작하므로 KST(UTC+9)로 변환
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);

  // 기상청 초단기실황은 매 정시 40분 이후 발표
  if (kst.getUTCMinutes() < 40) {
    kst.setUTCHours(kst.getUTCHours() - 1);
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${kst.getUTCFullYear()}${pad(kst.getUTCMonth() + 1)}${pad(kst.getUTCDate())}`;
  const time = `${pad(kst.getUTCHours())}00`;
  return { date, time };
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const apiKey = process.env.KMA_API_KEY;
  const { searchParams } = new URL(request.url);
  const nx = searchParams.get('nx') ?? '60';
  const ny = searchParams.get('ny') ?? '127';

  if (!apiKey) {
    return NextResponse.json({ data: MOCK_WEATHER, mock: true });
  }

  try {
    const { date, time } = getKSTBaseDateTime();
    const params = new URLSearchParams({
      serviceKey: apiKey,
      pageNo: '1',
      numOfRows: '100',
      dataType: 'JSON',
      base_date: date,
      base_time: time,
      nx,
      ny,
    });

    const res = await fetch(`${BASE_URL}?${params}`, { cache: 'no-store' });

    if (!res.ok) throw new Error(`기상청 API 오류: ${res.status}`);

    const json = await res.json();
    const items: Array<{ category: string; obsrValue: string }> =
      json?.response?.body?.items?.item ?? [];

    const get = (cat: string) => items.find((i) => i.category === cat)?.obsrValue ?? '0';

    const data: WeatherData = {
      temperature: parseFloat(get('T1H')),
      humidity: parseFloat(get('REH')),
      windSpeed: parseFloat(get('WSD')),
      windDirection: parseFloat(get('VEC')),
      precipitationType: parseInt(get('PTY'), 10),
      precipitation: get('RN1'),
      baseDate: date,
      baseTime: time,
      nx: parseInt(nx, 10),
      ny: parseInt(ny, 10),
    };

    return NextResponse.json({ data, mock: false });
  } catch (e) {
    console.error('Weather API error:', e);
    return NextResponse.json({ data: MOCK_WEATHER, mock: true, error: String(e) });
  }
}
