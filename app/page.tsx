'use client';

import { useEffect, useState, useCallback } from 'react';
import type { WeatherData, AirQualityData, GradeKey } from '@/lib/types';
import {
  GRADE_MAP, GRADE_LABEL, LOCATIONS,
  weatherIcon, weatherLabel, windDirectionLabel,
} from '@/lib/types';

interface ApiResult<T> { data?: T; error?: string; }

function GradeBadge({ grade }: { grade: string | null }) {
  if (!grade) return null;
  const key = (GRADE_MAP[grade] ?? 'moderate') as GradeKey;
  return <span className={`grade-badge badge-${key}`}>{GRADE_LABEL[key]}</span>;
}

function SkeletonRow() {
  return (
    <div className="weather-row">
      <div className="weather-row-label"><span className="skeleton" style={{ width: 80, height: 11 }}>&nbsp;</span></div>
      <div className="weather-row-right"><span className="skeleton" style={{ width: 55, height: 20 }}>&nbsp;</span></div>
      <div className="weather-row-title"><span className="skeleton" style={{ width: 180, height: 50 }}>&nbsp;</span></div>
    </div>
  );
}

function AirRow({
  label, value, grade, unit,
}: { label: string; value: string | null; grade?: string | null; unit: string }) {
  if (!value) return null;
  const gradeKey = grade ? (GRADE_MAP[grade] ?? null) as GradeKey | null : null;
  return (
    <div className="weather-row">
      <div className="weather-row-label">
        {label}
        {grade && <GradeBadge grade={grade} />}
      </div>
      <div className={`weather-row-right${gradeKey ? ` grade-${gradeKey}` : ''}`}>{unit}</div>
      <div className={`weather-row-title${gradeKey ? ` grade-${gradeKey}` : ''}`}>{value}</div>
    </div>
  );
}

function formatKSTTime(baseDate: string, baseTime: string): string {
  if (!baseDate || !baseTime) return '';
  const y = baseDate.slice(0, 4), m = baseDate.slice(4, 6), d = baseDate.slice(6, 8);
  const h = baseTime.slice(0, 2), min = baseTime.slice(2, 4);
  const days = ['일','월','화','수','목','금','토'];
  const day = days[new Date(`${y}-${m}-${d}T${h}:${min}:00+09:00`).getDay()];
  return `${m}월 ${d}일 (${day}) ${h}:${min}`;
}

export default function Home() {
  const [locationIdx, setLocationIdx] = useState(0);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [air, setAir] = useState<AirQualityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [wError, setWError] = useState<string | null>(null);
  const [aError, setAError] = useState<string | null>(null);

  const location = LOCATIONS[locationIdx];

  const fetchData = useCallback(async (loc: typeof LOCATIONS[number]) => {
    setLoading(true);
    setWError(null);
    setAError(null);
    // timestamp bust: Vercel Edge 캐시 방지
    const t = Date.now();
    const [wRes, aRes] = await Promise.allSettled([
      fetch(`/api/weather?nx=${loc.nx}&ny=${loc.ny}&t=${t}`),
      fetch(`/api/airquality?station=${encodeURIComponent(loc.station)}&t=${t}`),
    ]);

    if (wRes.status === 'fulfilled' && wRes.value.ok) {
      const j: ApiResult<WeatherData> = await wRes.value.json();
      if (j.data) setWeather(j.data); else { setWeather(null); setWError(j.error ?? '날씨 데이터 오류'); }
    } else {
      setWeather(null);
      setWError('날씨 데이터를 가져오지 못했습니다.');
    }

    if (aRes.status === 'fulfilled' && aRes.value.ok) {
      const j: ApiResult<AirQualityData> = await aRes.value.json();
      if (j.data) setAir(j.data); else { setAir(null); setAError(j.error ?? '대기질 데이터 오류'); }
    } else {
      setAir(null);
      setAError('대기질 데이터를 가져오지 못했습니다.');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData(location);
  }, [fetchData, location]);

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLocationIdx(Number(e.target.value));
    setWeather(null);
    setAir(null);
  };

  const icon  = weather ? weatherIcon(weather.precipitationType, weather.sky)  : '';
  const wLabel = weather ? weatherLabel(weather.precipitationType, weather.sky) : '';
  const windDir = weather ? windDirectionLabel(weather.windDirection) : '';
  const timeStr = weather ? formatKSTTime(weather.baseDate, weather.baseTime) : '';

  return (
    <main style={{ maxWidth: 540, margin: '0 auto', padding: '2rem 1.4rem 4rem' }}>
      <header style={{ marginBottom: '2.4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p className="font-label" style={{ fontSize: '0.65rem', color: '#888', marginBottom: '0.1rem' }}>날씨 & 미세먼지</p>
            <h1 className="font-display" style={{ fontSize: 'clamp(3.5rem, 14vw, 5.5rem)', lineHeight: 0.9, letterSpacing: '0.01em' }}>
              WEATHER
            </h1>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end', marginTop: '0.3rem' }}>
            <select className="location-select" value={locationIdx} onChange={handleLocationChange}>
              {LOCATIONS.map((loc, i) => (
                <option key={loc.name} value={i}>{loc.name}</option>
              ))}
            </select>
            <button className="refresh-btn" onClick={() => fetchData(location)} disabled={loading}
              style={{ opacity: loading ? 0.5 : 1 }}>
              {loading ? '...' : '새로고침'}
            </button>
          </div>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <p className="font-label" style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.08em' }}>
            {location.name} — {location.region}
          </p>
          <p className="font-label" style={{ fontSize: '0.6rem', color: '#888', marginTop: '0.25rem' }}>
            *기상청 초단기실황·예보 / 에어코리아 대기오염정보
          </p>
        </div>
      </header>

      {/* 날씨 섹션 */}
      <section style={{ marginBottom: '0.5rem' }}>
        <p className="font-label" style={{ fontSize: '0.6rem', color: '#888', marginBottom: '0.6rem', letterSpacing: '0.14em' }}>
          현재 날씨{timeStr && ` — ${timeStr}`}
        </p>

        {loading ? (
          <><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
        ) : wError ? (
          <p style={{ fontSize: '0.8rem', color: '#cc0000', padding: '1rem 0', fontFamily: 'Barlow Condensed, sans-serif' }}>{wError}</p>
        ) : weather ? (
          <>
            <div className="weather-row">
              <div className="weather-row-label">기온</div>
              <div className="weather-row-right">°C</div>
              <div className="weather-row-title">{weather.temperature}</div>
            </div>

            <div className="weather-row">
              <div className="weather-row-label">하늘상태</div>
              <div className="weather-row-right" style={{ fontSize: '1.8rem' }}>{icon}</div>
              <div className="weather-row-title">{wLabel}</div>
            </div>

            <div className="weather-row">
              <div className="weather-row-label">습도</div>
              <div className="weather-row-right">%</div>
              <div className="weather-row-title">{weather.humidity}</div>
            </div>

            <div className="weather-row">
              <div className="weather-row-label">풍속 / 풍향</div>
              <div className="weather-row-right">{windDir} · m/s</div>
              <div className="weather-row-title">{weather.windSpeed}</div>
            </div>

            <div className="weather-row">
              <div className="weather-row-label">1시간 강수량</div>
              <div className="weather-row-right">mm</div>
              <div className="weather-row-title">{weather.precipitation === '0' ? '0' : weather.precipitation}</div>
            </div>

            {weather.lightning !== null && (
              <div className="weather-row">
                <div className="weather-row-label">낙뢰</div>
                <div className="weather-row-right">{weather.lightning === 1 ? '⚡' : ''}</div>
                <div className="weather-row-title">{weather.lightning === 1 ? 'WARNING' : 'NONE'}</div>
              </div>
            )}
          </>
        ) : null}
      </section>

      {/* 대기질 섹션 */}
      <section style={{ marginTop: '2.2rem' }}>
        <p className="font-label" style={{ fontSize: '0.6rem', color: '#888', marginBottom: '0.6rem', letterSpacing: '0.14em' }}>
          대기질{air?.dataTime ? ` — ${air.dataTime}` : ''}
          {air && ` · ${air.stationName} 측정소`}
        </p>

        {loading ? (
          <><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
        ) : aError ? (
          <p style={{ fontSize: '0.8rem', color: '#cc0000', padding: '1rem 0', fontFamily: 'Barlow Condensed, sans-serif' }}>{aError}</p>
        ) : air ? (
          <>
            {air.khaiValue && (
              <div className="weather-row">
                <div className="weather-row-label">
                  통합대기환경지수
                  <GradeBadge grade={air.khaiGrade} />
                </div>
                <div className={`weather-row-right${air.khaiGrade ? ` grade-${GRADE_MAP[air.khaiGrade] ?? ''}` : ''}`}>KHAI</div>
                <div className={`weather-row-title${air.khaiGrade ? ` grade-${GRADE_MAP[air.khaiGrade] ?? ''}` : ''}`}>{air.khaiValue}</div>
              </div>
            )}

            <AirRow label="초미세먼지 PM2.5" value={air.pm25Value} grade={air.pm25Grade} unit="μg/m³" />
            <AirRow label="미세먼지 PM10"    value={air.pm10Value} grade={air.pm10Grade} unit="μg/m³" />
            <AirRow label="오존 O₃"          value={air.o3Value}   grade={air.o3Grade}   unit="ppm"   />
            <AirRow label="이산화질소 NO₂"   value={air.no2Value}  grade={air.no2Grade}  unit="ppm"   />
            <AirRow label="이산화황 SO₂"     value={air.so2Value}  grade={air.so2Grade}  unit="ppm"   />
            <AirRow label="일산화탄소 CO"     value={air.coValue}   grade={air.coGrade}   unit="ppm"   />
          </>
        ) : null}
      </section>

      <footer style={{ marginTop: '2.4rem', borderTop: '1px solid #ddd', paddingTop: '1rem' }}>
        <p className="font-label" style={{ fontSize: '0.55rem', color: '#aaa', letterSpacing: '0.1em' }}>
          출처: 기상청 기상자료개방포털 / 한국환경공단 에어코리아
        </p>
      </footer>
    </main>
  );
}
