'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import KoreaMap from '@/components/KoreaMap';
import { WARNING_TYPES, colorForLevel, findWarningType } from '@/lib/warningTypes';
import type { WarningEntry } from '@/app/api/warnings/route';

interface ApiResult { data?: { tmFc: string; tmEf: string; t6: string; entries: WarningEntry[] }; error?: string; }

function formatKST(yyyymmddhhmm: string): string {
  if (!yyyymmddhhmm || yyyymmddhhmm.length < 12) return '';
  const y = yyyymmddhhmm.slice(0, 4), mo = yyyymmddhhmm.slice(4, 6), d = yyyymmddhhmm.slice(6, 8);
  const h = yyyymmddhhmm.slice(8, 10), mi = yyyymmddhhmm.slice(10, 12);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const day = days[new Date(`${y}-${mo}-${d}T${h}:${mi}:00+09:00`).getDay()];
  return `${mo}월 ${d}일 (${day}) ${h}:${mi}`;
}

function currentKSTTime(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(11, 16);
}

export default function Home() {
  const [typeKey, setTypeKey] = useState(WARNING_TYPES[0].key);
  const [entries, setEntries] = useState<WarningEntry[]>([]);
  const [tmFc, setTmFc] = useState('');
  const [tmEf, setTmEf] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/warnings?t=${Date.now()}`);
      const json: ApiResult = await res.json();
      if (res.ok && json.data) {
        setEntries(json.data.entries);
        setTmFc(json.data.tmFc);
        setTmEf(json.data.tmEf);
      } else {
        setEntries([]);
        setError(json.error ?? '특보 데이터를 가져오지 못했습니다.');
      }
    } catch {
      setEntries([]);
      setError('특보 데이터를 가져오지 못했습니다.');
    } finally {
      setFetchedAt(currentKSTTime());
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedType = WARNING_TYPES.find((t) => t.key === typeKey) ?? WARNING_TYPES[0];

  const activeEntriesForType = useMemo(
    () => entries.filter((e) => e.typeKey === typeKey),
    [entries, typeKey]
  );

  const provinceColors = useMemo(() => {
    const colors: Record<string, string> = {};
    for (const entry of activeEntriesForType) {
      const color = colorForLevel(selectedType.color, entry.level);
      for (const province of entry.provinces) {
        // 경보가 주의보보다 우선(더 진한 색)하도록 덮어씀
        if (entry.level === '경보' || !colors[province]) {
          colors[province] = color;
        }
      }
    }
    return colors;
  }, [activeEntriesForType, selectedType]);

  const otherActiveTypes = useMemo(() => {
    const keys = new Set(entries.map((e) => e.typeKey));
    keys.delete(typeKey);
    return WARNING_TYPES.filter((t) => keys.has(t.key));
  }, [entries, typeKey]);

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1.4rem 4rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <p className="font-label" style={{ fontSize: '0.65rem', color: 'var(--color-muted)', marginBottom: '0.15rem' }}>
          기상청 기상특보
        </p>
        <h1 className="font-display" style={{ fontSize: 'clamp(3.2rem, 13vw, 5rem)', lineHeight: 0.88, letterSpacing: '0.01em' }}>
          WARNING
        </h1>

        <div className="control-bar">
          <select className="location-select" value={typeKey} onChange={(e) => setTypeKey(e.target.value)}>
            {WARNING_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
                {entries.some((e) => e.typeKey === t.key) ? ' ●' : ''}
              </option>
            ))}
          </select>
          <button className="refresh-btn" onClick={fetchData} disabled={loading}>
            {loading ? '···' : '↺ 새로고침'}
          </button>
        </div>

        <p className="font-label" style={{ fontSize: '0.58rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
          *기상청 기상특보 조회서비스(특보현황조회) — 시/도 단위 표시
        </p>
      </header>

      {error && (
        <p style={{ fontSize: '0.85rem', color: '#cc0000', padding: '1rem 0', fontFamily: 'Barlow Condensed, sans-serif' }}>
          {error}
        </p>
      )}

      {loading ? (
        <div className="map-skeleton skeleton" />
      ) : !error ? (
        <>
          <div className="map-frame">
            <KoreaMap colors={provinceColors} />
          </div>

          {/* 범례 */}
          <div className="legend">
            <span className="legend-item">
              <span className="legend-swatch" style={{ background: colorForLevel(selectedType.color, '주의보') }} />
              {selectedType.label} 주의보
            </span>
            <span className="legend-item">
              <span className="legend-swatch" style={{ background: colorForLevel(selectedType.color, '경보') }} />
              {selectedType.label} 경보
            </span>
            <span className="legend-item">
              <span className="legend-swatch" style={{ background: '#c7c7c7' }} />
              발표없음
            </span>
          </div>

          <p className="font-label" style={{ fontSize: '0.6rem', color: 'var(--color-muted)', marginTop: '1rem', letterSpacing: '0.1em' }}>
            발표 {formatKST(tmFc)} · 발효 {formatKST(tmEf)}
            {fetchedAt && ` · 조회 ${fetchedAt} KST`}
          </p>

          {activeEntriesForType.length > 0 && (
            <section style={{ marginTop: '1.6rem' }}>
              <p className="font-label" style={{ fontSize: '0.6rem', color: 'var(--color-muted)', marginBottom: '0.5rem', letterSpacing: '0.14em' }}>
                {selectedType.label} 특보 상세
              </p>
              {activeEntriesForType.map((e, i) => (
                <div key={i} className="warning-detail-row">
                  <span className={`grade-badge`} style={{ background: colorForLevel(selectedType.color, e.level), color: '#fff' }}>
                    {e.level}
                  </span>
                  <span>{e.areaText}</span>
                </div>
              ))}
            </section>
          )}

          {otherActiveTypes.length > 0 && (
            <section style={{ marginTop: '1.6rem' }}>
              <p className="font-label" style={{ fontSize: '0.6rem', color: 'var(--color-muted)', marginBottom: '0.5rem', letterSpacing: '0.14em' }}>
                그 밖에 발효 중인 특보
              </p>
              <p style={{ fontSize: '0.85rem' }}>
                {otherActiveTypes.map((t) => t.label).join(' · ')}
              </p>
            </section>
          )}

          {entries.length === 0 && (
            <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginTop: '1.6rem' }}>
              현재 전국에 발효 중인 기상특보가 없습니다.
            </p>
          )}
        </>
      ) : null}

      <footer style={{ marginTop: '2.4rem', borderTop: '1px solid var(--color-divider)', paddingTop: '1rem' }}>
        <p className="font-label" style={{ fontSize: '0.55rem', color: 'var(--color-footer)', letterSpacing: '0.1em' }}>
          출처: 기상청 기상자료개방포털 (기상특보 조회서비스)
        </p>
      </footer>
    </main>
  );
}
