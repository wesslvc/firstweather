'use client';

import { useEffect, useState, useCallback } from 'react';
import type { WeatherData, AirQualityData, GradeKey } from '@/lib/types';
import { GRADE_MAP, GRADE_LABEL, PRECIP_LABEL, PRECIP_ICON, windDirectionLabel } from '@/lib/types';

// 기본 위치: 서울 (기상청 격자 60, 127 / 에어코리아 중구)
const DEFAULT_LOCATION = {
  name: '서울',
  region: '대한민국',
  nx: 60,
  ny: 127,
  station: '중구',
};

interface ApiResult<T> {
  data: T;
  mock: boolean;
}

function GradeBadge({ grade }: { grade: string }) {
  const key = (GRADE_MAP[grade] ?? 'moderate') as GradeKey;
  return (
    <span className={`grade-badge badge-${key}`}>
      {GRADE_LABEL[key]}
    </span>
  );
}

function SkeletonRow() {
  return (
    <div className="weather-row">
      <div className="weather-row-label">
        <span className="skeleton" style={{ width: 80, height: 12 }}>&nbsp;</span>
      </div>
      <div className="weather-row-right">
        <span className="skeleton" style={{ width: 60, height: 22 }}>&nbsp;</span>
      </div>
      <div className="weather-row-title">
        <span className="skeleton" style={{ width: 200, height: 52 }}>&nbsp;</span>
      </div>
    </div>
  );
}

function formatTime(baseDate: string, baseTime: string): string {
  if (!baseDate || !baseTime) return '';
  const y = baseDate.slice(0, 4);
  const m = baseDate.slice(4, 6);
  const d = baseDate.slice(6, 8);
  const h = baseTime.slice(0, 2);
  const min = baseTime.slice(2, 4);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const date = new Date(`${y}-${m}-${d}T${h}:${min}:00`);
  const dayName = days[date.getDay()];
  return `${m}월 ${d}일 (${dayName}) ${h}:${min}`;
}

export default function Home() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [air, setAir] = useState<AirQualityData | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [wRes, aRes] = await Promise.all([
        fetch(`/api/weather?nx=${DEFAULT_LOCATION.nx}&ny=${DEFAULT_LOCATION.ny}`),
        fetch(`/api/airquality?station=${encodeURIComponent(DEFAULT_LOCATION.station)}`),
      ]);

      const wJson: ApiResult<WeatherData> = await wRes.json();
      const aJson: ApiResult<AirQualityData> = await aRes.json();

      setWeather(wJson.data);
      setAir(aJson.data);
      setIsMock(wJson.mock || aJson.mock);
      setLastUpdated(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
    } catch {
      setError('데이터를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const precipIcon = weather ? PRECIP_ICON[weather.precipitationType] ?? '🌤️' : '';
  const precipLabel = weather ? PRECIP_LABEL[weather.precipitationType] ?? '-' : '';
  const windDir = weather ? windDirectionLabel(weather.windDirection) : '';

  const pm25Grade = air ? (GRADE_MAP[air.pm25Grade] ?? 'moderate') as GradeKey : 'moderate';
  const pm10Grade = air ? (GRADE_MAP[air.pm10Grade] ?? 'moderate') as GradeKey : 'moderate';

  const timeStr = weather ? formatTime(weather.baseDate, weather.baseTime) : '';

  return (
    <main style={{ maxWidth: 540, margin: '0 auto', padding: '2rem 1.4rem 4rem' }}>
      {/* Header */}
      <header style={{ marginBottom: '2.4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p className="font-label" style={{ fontSize: '0.65rem', color: '#888', marginBottom: '0.1rem' }}>
              날씨 & 미세먼지
            </p>
            <h1 className="font-display" style={{ fontSize: 'clamp(3.5rem, 14vw, 5.5rem)', lineHeight: 0.9, letterSpacing: '0.01em' }}>
              WEATHER
            </h1>
          </div>
          <button
            className="refresh-btn"
            onClick={fetchData}
            disabled={loading}
            style={{ marginTop: '0.3rem', opacity: loading ? 0.5 : 1 }}
          >
            {loading ? '...' : '새로고침'}
          </button>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <p className="font-label" style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.08em' }}>
            {DEFAULT_LOCATION.name} — {DEFAULT_LOCATION.region}
          </p>
          <p className="font-label" style={{ fontSize: '0.6rem', color: '#888', marginTop: '0.25rem' }}>
            *기상청 초단기실황 / 에어코리아 대기오염정보
            {isMock && ' (데모 데이터)'}
          </p>
        </div>
      </header>

      {error && (
        <p style={{ color: 'red', fontSize: '0.8rem', marginBottom: '1rem', fontFamily: 'Barlow Condensed, sans-serif' }}>
          {error}
        </p>
      )}

      {/* Section: 날씨 */}
      <section style={{ marginBottom: '0.5rem' }}>
        <p className="font-label" style={{ fontSize: '0.6rem', color: '#888', marginBottom: '0.6rem', letterSpacing: '0.14em' }}>
          현재 날씨 {timeStr && `— ${timeStr}`}
        </p>

        {loading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : weather ? (
          <>
            {/* 기온 */}
            <div className="weather-row">
              <div className="weather-row-label">기온</div>
              <div className="weather-row-right">°C</div>
              <div className="weather-row-title">{weather.temperature}</div>
            </div>

            {/* 하늘/강수 상태 */}
            <div className="weather-row">
              <div className="weather-row-label">강수형태</div>
              <div className="weather-row-right" style={{ fontSize: '1.8rem' }}>{precipIcon}</div>
              <div className="weather-row-title">{precipLabel}</div>
            </div>

            {/* 습도 */}
            <div className="weather-row">
              <div className="weather-row-label">습도</div>
              <div className="weather-row-right">%</div>
              <div className="weather-row-title">{weather.humidity}</div>
            </div>

            {/* 풍속 */}
            <div className="weather-row">
              <div className="weather-row-label">풍속 / 풍향</div>
              <div className="weather-row-right">{windDir} · m/s</div>
              <div className="weather-row-title">{weather.windSpeed}</div>
            </div>

            {/* 강수량 */}
            <div className="weather-row">
              <div className="weather-row-label">1시간 강수량</div>
              <div className="weather-row-right">mm</div>
              <div className="weather-row-title">{weather.precipitation === '0' ? '0' : weather.precipitation}</div>
            </div>
          </>
        ) : null}
      </section>

      {/* Section: 미세먼지 */}
      <section style={{ marginTop: '2.2rem' }}>
        <p className="font-label" style={{ fontSize: '0.6rem', color: '#888', marginBottom: '0.6rem', letterSpacing: '0.14em' }}>
          대기질 — {air?.dataTime ?? ''}
          {air && ` · ${air.stationName} 측정소`}
        </p>

        {loading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : air ? (
          <>
            {/* PM2.5 */}
            <div className="weather-row">
              <div className="weather-row-label">
                초미세먼지 PM2.5
                <GradeBadge grade={air.pm25Grade} />
              </div>
              <div className={`weather-row-right grade-${pm25Grade}`}>μg/m³</div>
              <div className={`weather-row-title grade-${pm25Grade}`}>{air.pm25Value}</div>
            </div>

            {/* PM10 */}
            <div className="weather-row">
              <div className="weather-row-label">
                미세먼지 PM10
                <GradeBadge grade={air.pm10Grade} />
              </div>
              <div className={`weather-row-right grade-${pm10Grade}`}>μg/m³</div>
              <div className={`weather-row-title grade-${pm10Grade}`}>{air.pm10Value}</div>
            </div>

            {/* 오존 */}
            <div className="weather-row">
              <div className="weather-row-label">오존 O₃</div>
              <div className="weather-row-right">ppm</div>
              <div className="weather-row-title">{air.o3Value}</div>
            </div>

            {/* 일산화탄소 */}
            <div className="weather-row">
              <div className="weather-row-label">일산화탄소 CO</div>
              <div className="weather-row-right">ppm</div>
              <div className="weather-row-title">{air.coValue}</div>
            </div>
          </>
        ) : null}
      </section>

      {/* Footer */}
      <footer style={{ marginTop: '2.4rem', borderTop: '1px solid #ddd', paddingTop: '1rem' }}>
        <p className="font-label" style={{ fontSize: '0.55rem', color: '#aaa', letterSpacing: '0.1em' }}>
          {lastUpdated && `마지막 업데이트 ${lastUpdated} · `}
          출처: 기상청 기상자료개방포털 / 한국환경공단 에어코리아
        </p>
      </footer>
    </main>
  );
}
