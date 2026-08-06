'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { SENSORS, SENSOR_GUS } from '@/lib/sdotSensors';

// route.ts와 같은 목록 (클라이언트가 서버 전용 모듈을 import 하지 않도록 여기에 둔다)
const METRICS: Array<[string, string, string]> = [
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

interface Reading {
  serial: string;
  sensingTime: string;
  autonomousDistrict: string;
  administrativeDistrict: string;
  dataNo: string;
  metrics: Record<string, { min: string | null; avg: string | null; max: string | null }>;
}

function formatSensingTime(raw: string): string {
  // "2026-08-06 13:00" 또는 "202608061300" 형태 모두 처리
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 12) return raw;
  const mo = digits.slice(4, 6), d = digits.slice(6, 8);
  const h = digits.slice(8, 10), mi = digits.slice(10, 12);
  return `${mo}월 ${d}일 ${h}:${mi}`;
}

export default function SdotView() {
  const [gu, setGu] = useState<string>(SENSOR_GUS[0]);
  const [serial, setSerial] = useState<string>('');
  const [query, setQuery] = useState('');
  const [reading, setReading] = useState<Reading | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensorsInGu = useMemo(() => SENSORS.filter((s) => s.gu === gu), [gu]);

  const searchResults = useMemo(() => {
    const q = query.trim().replace(/\s/g, '').toUpperCase();
    if (!q) return [];
    return SENSORS.filter(
      (s) => s.serial.toUpperCase().includes(q) || `${s.gu}${s.detail}`.replace(/\s/g, '').includes(q)
    ).slice(0, 8);
  }, [query]);

  // 자치구를 바꾸면 그 구의 첫 센서를 기본 선택
  useEffect(() => {
    if (sensorsInGu.length > 0 && !sensorsInGu.some((s) => s.serial === serial)) {
      setSerial(sensorsInGu[0].serial);
    }
  }, [sensorsInGu, serial]);

  const load = useCallback(async (target: string) => {
    if (!target) return;
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(`/api/sdot?serial=${encodeURIComponent(target)}&t=${Date.now()}`, {
        signal: controller.signal,
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setReading(json.data);
      } else {
        setReading(null);
        setError(json.error ?? '센서 자료를 가져오지 못했습니다.');
      }
    } catch (e) {
      setReading(null);
      setError(
        e instanceof DOMException && e.name === 'AbortError'
          ? '응답이 너무 늦어 요청을 중단했습니다. 다시 시도해 주세요.'
          : '센서 자료를 가져오지 못했습니다.'
      );
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, []);

  const selectSensor = (s: { serial: string; gu: string }) => {
    setGu(s.gu);
    setSerial(s.serial);
    setQuery('');
    load(s.serial);
  };

  const currentSensor = SENSORS.find((s) => s.serial === serial);

  return (
    <>
      <div className="app-header">
        <div>
          <div className="app-title">S-DoT 센서</div>
          <div className="app-subtitle">스마트서울 도시데이터 센서 환경정보 (실시간)</div>
        </div>
        <div className="header-actions">
          <button className="icon-btn primary" onClick={() => load(serial)} disabled={loading || !serial}>
            {loading ? '···' : '조회'}
          </button>
        </div>
      </div>

      <div className="search-box">
        <input
          className="search-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="시리얼 또는 주소 검색 (예: V02Q1940655, 북촌로)"
          aria-label="센서 검색"
        />
        {searchResults.length > 0 && (
          <ul className="search-results">
            {searchResults.map((s) => (
              <li key={s.serial}>
                <button className="search-result" onClick={() => selectSensor(s)}>
                  <span className="search-result-province">{s.gu}</span>
                  {s.detail}
                  <span className="sensor-serial">{s.serial}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {query.trim() && searchResults.length === 0 && (
          <p className="search-empty">일치하는 센서가 없습니다.</p>
        )}
      </div>

      <div className="sdot-picker">
        <select className="sdot-select" value={gu} onChange={(e) => setGu(e.target.value)} aria-label="자치구">
          {SENSOR_GUS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <select
          className="sdot-select grow"
          value={serial}
          onChange={(e) => { setSerial(e.target.value); load(e.target.value); }}
          aria-label="센서 위치"
        >
          {sensorsInGu.map((s) => (
            <option key={s.serial} value={s.serial}>{s.detail} · {s.serial}</option>
          ))}
        </select>
      </div>

      {error && <p style={{ fontSize: '0.85rem', color: '#e5484d', padding: '0.6rem 0' }}>{error}</p>}

      {currentSensor && (
        <div className="sdot-card">
          <div className="sdot-card-head">
            <div>
              <div className="sdot-place">{currentSensor.gu} {currentSensor.detail}</div>
              <div className="sdot-meta">
                {serial}
                {reading?.sensingTime && ` · 측정 ${formatSensingTime(reading.sensingTime)}`}
                {reading?.dataNo === '2' && ' · 보정값'}
              </div>
            </div>
          </div>

          {loading ? (
            <p className="empty-note">불러오는 중입니다…</p>
          ) : reading ? (
            <table className="sdot-table">
              <thead>
                <tr>
                  <th>항목</th>
                  <th>최소</th>
                  <th>평균</th>
                  <th>최대</th>
                </tr>
              </thead>
              <tbody>
                {METRICS.filter(([key]) => reading.metrics[key]).map(([key, label, unit]) => {
                  const m = reading.metrics[key];
                  return (
                    <tr key={key}>
                      <td className="sdot-label">{label}{unit && <span className="sdot-unit">{unit}</span>}</td>
                      <td>{m.min ?? '-'}</td>
                      <td className="sdot-avg">{m.avg ?? '-'}</td>
                      <td>{m.max ?? '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : !error ? (
            <p className="empty-note">조회를 눌러 최신 측정값을 불러오세요.</p>
          ) : null}
        </div>
      )}

      <div className="app-footer">
        출처: 서울 열린데이터광장 (스마트서울 도시데이터 센서 S-DoT 환경정보) · 미세먼지 항목은 관련 법령에 따라 비공개
      </div>
    </>
  );
}
