'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import KoreaMap from '@/components/KoreaMap';
import { WARNING_TYPES, colorForLevel, warningTypeByKey } from '@/lib/warningTypes';
import { PROVINCES } from '@/lib/regionMap';
import type { WarningEntry } from '@/app/api/warnings/route';

interface ApiResult { data?: { tmFc: string; tmEf: string; t6: string; entries: WarningEntry[] }; error?: string; }

const ALL = 'ALL';
const LEVEL_ORDER: Record<string, number> = { 경보: 2, 특보: 1, 주의보: 0 };

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
  const [selectedKey, setSelectedKey] = useState<string>(ALL);
  const [entries, setEntries] = useState<WarningEntry[]>([]);
  const [tmFc, setTmFc] = useState('');
  const [tmEf, setTmEf] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState('');
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const mapWrapRef = useRef<HTMLDivElement>(null);

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

  const activeTypeKeys = useMemo(() => new Set(entries.map((e) => e.typeKey)), [entries]);

  // province id -> { typeKey -> 최고심도 entry } (전체보기용 집계)
  const byProvince = useMemo(() => {
    const map = new Map<string, Map<string, WarningEntry>>();
    for (const entry of entries) {
      for (const province of entry.provinces) {
        if (!map.has(province)) map.set(province, new Map());
        const typeMap = map.get(province)!;
        const existing = typeMap.get(entry.typeKey);
        if (!existing || LEVEL_ORDER[entry.level] > LEVEL_ORDER[existing.level]) {
          typeMap.set(entry.typeKey, entry);
        }
      }
    }
    return map;
  }, [entries]);

  const provinceFills = useMemo(() => {
    const fills: Record<string, string[]> = {};
    if (selectedKey === ALL) {
      for (const [province, typeMap] of byProvince) {
        fills[province] = WARNING_TYPES.filter((t) => typeMap.has(t.key)).map((t) => {
          const e = typeMap.get(t.key)!;
          return colorForLevel(t.color, e.level);
        });
      }
    } else {
      const type = warningTypeByKey(selectedKey);
      if (type) {
        for (const [province, typeMap] of byProvince) {
          const e = typeMap.get(selectedKey);
          if (e) fills[province] = [colorForLevel(type.color, e.level)];
        }
      }
    }
    return fills;
  }, [byProvince, selectedKey]);

  const activeEntriesForType = useMemo(
    () => (selectedKey === ALL ? [] : entries.filter((e) => e.typeKey === selectedKey)),
    [entries, selectedKey]
  );

  const selectedProvinceEntries = useMemo(() => {
    if (!selectedProvince) return [];
    return entries.filter((e) => e.provinces.includes(selectedProvince));
  }, [entries, selectedProvince]);

  const selectedProvinceLabel = PROVINCES.find((p) => p.id === selectedProvince)?.label ?? '';

  const handleDownload = () => {
    const svg = mapWrapRef.current?.querySelector('svg');
    if (!svg) return;
    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([serialized], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `기상특보_${selectedKey === ALL ? '전체' : selectedKey}_${tmFc || 'map'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedType = selectedKey === ALL ? null : warningTypeByKey(selectedKey) ?? null;

  return (
    <main className="app-shell">
      <div className="app-header">
        <div>
          <div className="app-title">기상특보 지도</div>
          <div className="app-subtitle">기상청 기상특보 조회서비스 · 시/도 단위</div>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={handleDownload} disabled={loading || !!error}>
            지도 저장
          </button>
          <button className="icon-btn primary" onClick={fetchData} disabled={loading}>
            {loading ? '···' : '새로고침'}
          </button>
        </div>
      </div>

      <div className="type-chips">
        <button
          className={`type-chip gradient-dot${selectedKey === ALL ? ' active' : ''}`}
          onClick={() => setSelectedKey(ALL)}
        >
          <span className="dot" />
          전체
        </button>
        {WARNING_TYPES.map((t) => (
          <button
            key={t.code}
            className={`type-chip${selectedKey === t.key ? ' active' : ''}`}
            onClick={() => setSelectedKey(t.key)}
          >
            <span className="dot" style={{ background: t.color }} />
            {t.label}
            {activeTypeKeys.has(t.key) && ' ●'}
          </button>
        ))}
      </div>

      {error && (
        <p style={{ fontSize: '0.85rem', color: '#e5484d', padding: '0.6rem 0' }}>{error}</p>
      )}

      {loading ? (
        <div className="map-card">
          <div className="map-skeleton skeleton" />
        </div>
      ) : !error ? (
        <>
          <div className="map-card">
            <div ref={mapWrapRef}>
              <KoreaMap
                provinceFills={provinceFills}
                selectedId={selectedProvince}
                onProvinceClick={setSelectedProvince}
              />
            </div>

            <div className="legend">
              {selectedKey === ALL ? (
                WARNING_TYPES.map((t) => (
                  <span className="legend-item" key={t.code}>
                    <span className="legend-swatch" style={{ background: t.color }} />
                    {t.label}
                  </span>
                ))
              ) : (
                <>
                  <span className="legend-item">
                    <span className="legend-swatch" style={{ background: colorForLevel(selectedType!.color, '주의보') }} />
                    {selectedType!.label} 주의보
                  </span>
                  <span className="legend-item">
                    <span className="legend-swatch" style={{ background: selectedType!.color }} />
                    {selectedType!.label} 경보
                  </span>
                </>
              )}
              <span className="legend-item">
                <span className="legend-swatch" style={{ background: 'var(--color-map-empty)' }} />
                발표없음
              </span>
            </div>

            <p className="meta-line">
              발표 {formatKST(tmFc)} · 발효 {formatKST(tmEf)}
              {fetchedAt && ` · 조회 ${fetchedAt} KST`} · 지역을 클릭하면 상세 특보를 볼 수 있습니다
            </p>
          </div>

          {selectedProvince && (
            <div className="detail-panel">
              <div className="detail-panel-header">
                <span className="detail-panel-title">{selectedProvinceLabel}</span>
                <button className="detail-close-btn" onClick={() => setSelectedProvince(null)}>✕</button>
              </div>
              {selectedProvinceEntries.length > 0 ? (
                selectedProvinceEntries.map((e, i) => {
                  const type = warningTypeByKey(e.typeKey);
                  return (
                    <div key={i} className="detail-row">
                      <span className="level-badge" style={{ background: type ? colorForLevel(type.color, e.level) : '#888' }}>
                        {e.label}
                      </span>
                      <span style={{ color: 'var(--color-muted)' }}>{e.areaText}</span>
                    </div>
                  );
                })
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>현재 발효 중인 특보가 없습니다.</p>
              )}
            </div>
          )}

          {selectedKey !== ALL && activeEntriesForType.length > 0 && (
            <div className="warning-list">
              <div className="warning-list-title">{selectedType!.label} 특보 상세</div>
              {activeEntriesForType.map((e, i) => (
                <div key={i} className="warning-detail-row">
                  <span className="level-badge" style={{ background: colorForLevel(selectedType!.color, e.level) }}>
                    {e.level}
                  </span>
                  <span>{e.areaText}</span>
                </div>
              ))}
            </div>
          )}

          {entries.length === 0 && (
            <p className="empty-note">현재 전국에 발효 중인 기상특보가 없습니다.</p>
          )}
        </>
      ) : null}

      <div className="app-footer">
        출처: 기상청 기상자료개방포털 (기상특보 조회서비스)
      </div>
    </main>
  );
}
