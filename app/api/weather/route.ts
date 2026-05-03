import { NextRequest, NextResponse } from 'next/server';
import { MOCK_WEATHER } from '@/lib/mockData';
import type { WeatherData } from '@/lib/types';

const BASE_URL = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst';

function getBaseDateTime(): { date: string; time: string } {
  const now = new Date();
  // 기상청 초단기실황은 매 정시 40분 이후 발표, 1시간 단위
  const minutes = now.getMinutes();
  if (minutes < 40) now.setHours(now.getHours() - 1);

  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}00`;
  return { date, time };
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.KMA_API_KEY;
  const { searchParams } = new URL(request.url);
  const nx = searchParams.get('nx') ?? '60';
  const ny = searchParams.get('ny') ?? '127';

  if (!apiKey) {
    return NextResponse.json({ data: MOCK_WEATHER, mock: true });
  }

  try {
    const { date, time } = getBaseDateTime();
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

    const res = await fetch(`${BASE_URL}?${params}`, {
      next: { revalidate: 1800 },
    });

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
