import { NextRequest, NextResponse } from 'next/server';
import type { WeatherData } from '@/lib/types';

const NCST_URL  = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst';
const FCST_URL  = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst';

const NO_CACHE = { cache: 'no-store' as const };
const NO_CACHE_HEADERS = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export const dynamic = 'force-dynamic';

function kstNow(): Date {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

function pad(n: number) { return String(n).padStart(2, '0'); }

function ncstBaseTime(kst: Date): { date: string; time: string } {
  const m = kst.getUTCMinutes();
  const h = m < 40 ? kst.getUTCHours() - 1 : kst.getUTCHours();
  const d = new Date(kst);
  d.setUTCHours(h < 0 ? 23 : h);
  if (h < 0) d.setUTCDate(d.getUTCDate() - 1);
  return {
    date: `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}00`,
  };
}

function fcstBaseTime(kst: Date): { date: string; time: string } {
  // 초단기예보: 매 30분 발표, 발표 후 약 10분 소요
  const buffered = new Date(kst.getTime() - 10 * 60 * 1000);
  const m = buffered.getUTCMinutes();
  const baseMin = m < 30 ? 0 : 30;
  const d = new Date(buffered);
  d.setUTCMinutes(baseMin, 0, 0);
  return {
    date: `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}${pad(baseMin)}`,
  };
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.KMA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API 키가 설정되지 않았습니다.' }, { status: 503, headers: NO_CACHE_HEADERS });
  }

  const { searchParams } = new URL(request.url);
  const nx = searchParams.get('nx') ?? '60';
  const ny = searchParams.get('ny') ?? '127';
  const kst = kstNow();

  try {
    const { date: ncstDate, time: ncstTime } = ncstBaseTime(kst);
    const { date: fcstDate, time: fcstTime } = fcstBaseTime(kst);

    const ncstParams = new URLSearchParams({
      serviceKey: apiKey, pageNo: '1', numOfRows: '100', dataType: 'JSON',
      base_date: ncstDate, base_time: ncstTime, nx, ny,
    });
    const fcstParams = new URLSearchParams({
      serviceKey: apiKey, pageNo: '1', numOfRows: '100', dataType: 'JSON',
      base_date: fcstDate, base_time: fcstTime, nx, ny,
    });

    const [ncstRes, fcstRes] = await Promise.all([
      fetch(`${NCST_URL}?${ncstParams}`, NO_CACHE),
      fetch(`${FCST_URL}?${fcstParams}`, NO_CACHE),
    ]);

    if (!ncstRes.ok) throw new Error(`기상청 실황 API ${ncstRes.status}`);

    const ncstJson = await ncstRes.json();
    const ncstItems: Array<{ category: string; obsrValue: string }> =
      ncstJson?.response?.body?.items?.item ?? [];

    const getNcst = (cat: string) => ncstItems.find(i => i.category === cat)?.obsrValue ?? null;

    // 초단기예보에서 현재 시각과 가장 가까운 SKY, LGT 가져오기
    let sky: number | null = null;
    let lightning: number | null = null;
    if (fcstRes.ok) {
      const fcstJson = await fcstRes.json();
      const fcstItems: Array<{ category: string; fcstValue: string; fcstDate: string; fcstTime: string }> =
        fcstJson?.response?.body?.items?.item ?? [];
      // 현재 KST 시각의 예보 슬롯을 찾음
      const currentHHMM = `${pad(kst.getUTCHours())}${pad(Math.floor(kst.getUTCMinutes() / 30) * 30)}`;
      const skyItem = fcstItems.find(i => i.category === 'SKY' && i.fcstTime === currentHHMM)
        ?? fcstItems.find(i => i.category === 'SKY');
      const lgtItem = fcstItems.find(i => i.category === 'LGT' && i.fcstTime === currentHHMM)
        ?? fcstItems.find(i => i.category === 'LGT');
      if (skyItem) sky = parseInt(skyItem.fcstValue, 10);
      if (lgtItem) lightning = parseInt(lgtItem.fcstValue, 10);
    }

    const tempRaw    = getNcst('T1H');
    const humRaw     = getNcst('REH');
    const windSRaw   = getNcst('WSD');
    const windDRaw   = getNcst('VEC');
    const ptyRaw     = getNcst('PTY');
    const rn1Raw     = getNcst('RN1');

    const data: WeatherData = {
      temperature:       tempRaw   !== null ? parseFloat(tempRaw)   : 0,
      humidity:          humRaw    !== null ? parseFloat(humRaw)    : 0,
      windSpeed:         windSRaw  !== null ? parseFloat(windSRaw)  : 0,
      windDirection:     windDRaw  !== null ? parseFloat(windDRaw)  : 0,
      precipitationType: ptyRaw    !== null ? parseInt(ptyRaw, 10)  : 0,
      precipitation:     rn1Raw    ?? '0',
      sky,
      lightning,
      baseDate: ncstDate,
      baseTime: ncstTime,
    };

    return NextResponse.json({ data }, { headers: NO_CACHE_HEADERS });
  } catch (e) {
    console.error('Weather API error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
