'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import KoreaMap from '@/components/KoreaMap';
import ZoomableMap from '@/components/ZoomableMap';
import {
  WARNING_TYPES,
  LEVEL_ORDER,
  colorForLevel,
  textColorFor,
  warningTypeByKey,
  type WarningEntry,
} from '@/lib/warningTypes';
import { DISTRICTS, PROVINCES } from '@/lib/regionMap';

interface ApiResult { data?: { tmFc: string; tmEf: string; t6: string; entries: WarningEntry[] }; error?: string; }

// 검색용: "서울 종로구"처럼 시/도 + 시군구를 한 문자열로 붙여 둔다
const SEARCH_INDEX = DISTRICTS.map((d) => {
  const provinceLabel = PROVINCES.find((p) => p.id === d.provinceId)?.label ?? '';
  return { id: d.id, label: d.label, provinceLabel, haystack: `${provinceLabel}${d.label}`.replace(/\s/g, '') };
});

// 기상청은 tmFc를 숫자로 줄 때가 있어 어떤 타입이 와도 안전하게 처리한다
function formatKST(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value);
  if (s.length < 12) return '';
  const y = s.slice(0, 4), mo = s.slice(4, 6), d = s.slice(6, 8);
  const h = s.slice(8, 10), mi = s.slice(10, 12);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const day = days[new Date(`${y}-${mo}-${d}T${h}:${mi}:00+09:00`).getDay()];
  return `${mo}월 ${d}일 (${day}) ${h}:${mi}`;
}

function currentKSTTime(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(11, 16);
}

export default function WarningView() {
  const [selectedKey, setSelectedKey] = useState<string>(WARNING_TYPES[0].key);
  const [query, setQuery] = useState('');
  const [entries, setEntries] = useState<WarningEntry[]>([]);
  const [tmFc, setTmFc] = useState('');
  const [tmEf, setTmEf] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    // 서버 라우트의 총 예산(8.5초) + 콜드스타트 여유를 감안해 넉넉하게 잡는다
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(`/api/warnings?t=${Date.now()}`, { signal: controller.signal });
      const json: ApiResult = await res.json();
      if (res.ok && json.data) {
        setEntries(json.data.entries);
        setTmFc(json.data.tmFc);
        setTmEf(json.data.tmEf);
      } else {
        setEntries([]);
        setError(json.error ?? '특보 데이터를 가져오지 못했습니다.');
      }
    } catch (e) {
      setEntries([]);
      setError(
        e instanceof DOMException && e.name === 'AbortError'
          ? '응답이 너무 늦어 요청을 중단했습니다. 새로고침을 눌러 다시 시도해 주세요.'
          : '특보 데이터를 가져오지 못했습니다.'
      );
    } finally {
      clearTimeout(timeout);
      setFetchedAt(currentKSTTime());
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeTypeKeys = useMemo(() => new Set(entries.map((e) => e.typeKey)), [entries]);

  // 지금 고른 특보가 발효 중이 아니면, 실제로 발효 중인 첫 특보로 옮겨 준다
  useEffect(() => {
    if (entries.length === 0 || activeTypeKeys.has(selectedKey)) return;
    const firstActive = WARNING_TYPES.find((t) => activeTypeKeys.has(t.key));
    if (firstActive) setSelectedKey(firstActive.key);
  }, [entries, activeTypeKeys, selectedKey]);

  // district id -> { typeKey -> 최고심도 entry } (전체보기용 집계)
  const byDistrict = useMemo(() => {
    const map = new Map<string, Map<string, WarningEntry>>();
    for (const entry of entries) {
      for (const district of entry.districts) {
        if (!map.has(district)) map.set(district, new Map());
        const typeMap = map.get(district)!;
        const existing = typeMap.get(entry.typeKey);
        if (!existing || LEVEL_ORDER[entry.level] > LEVEL_ORDER[existing.level]) {
          typeMap.set(entry.typeKey, entry);
        }
      }
    }
    return map;
  }, [entries]);

  const districtFills = useMemo(() => {
    const fills: Record<string, string[]> = {};
    const type = warningTypeByKey(selectedKey);
    if (type) {
      for (const [district, typeMap] of byDistrict) {
        const e = typeMap.get(selectedKey);
        if (e) fills[district] = [colorForLevel(type.color, e.level)];
      }
    }
    return fills;
  }, [byDistrict, selectedKey]);

  const activeEntriesForType = useMemo(
    () => entries.filter((e) => e.typeKey === selectedKey),
    [entries, selectedKey]
  );

  const searchResults = useMemo(() => {
    const q = query.trim().replace(/\s/g, '');
    if (!q) return [];
    return SEARCH_INDEX.filter((d) => d.haystack.includes(q)).slice(0, 8);
  }, [query]);

  // 지역을 누르면 상세 패널이 보이도록 내려준다.
  // (지도 확대 애니메이션이 시작된 뒤 움직여야 자연스럽다)
  useEffect(() => {
    if (!selectedDistrict) return;
    const timer = setTimeout(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 120);
    return () => clearTimeout(timer);
  }, [selectedDistrict]);

  // 지역을 고르지 않았을 때 아래에 쭉 보여줄 목록
  const listEntries = activeEntriesForType;

  const selectedDistrictEntries = useMemo(() => {
    if (!selectedDistrict) return [];
    return entries.filter((e) => e.districts.includes(selectedDistrict));
  }, [entries, selectedDistrict]);

  const selectedDistrictInfo = DISTRICTS.find((d) => d.id === selectedDistrict);
  const selectedDistrictProvinceLabel = PROVINCES.find((p) => p.id === selectedDistrictInfo?.provinceId)?.label ?? '';
  const selectedDistrictLabel = selectedDistrictInfo
    ? `${selectedDistrictProvinceLabel} ${selectedDistrictInfo.label}`
    : '';

  // 지도를 PNG로 저장한다.
  // SVG 그대로 받으면 (1) 색을 CSS 변수로 지정한 부분이 파일 안에서 정의되지 않아
  // 발표없음 지역이 비어 보이고 (2) 휴대폰 갤러리 앱이 SVG를 열지 못한다.
  // 그래서 변수를 실제 색으로 치환하고 배경을 깐 뒤 canvas로 PNG를 만든다.
  const handleDownload = () => {
    const svg = mapWrapRef.current?.querySelector('svg');
    if (!svg) return;

    const rootStyle = getComputedStyle(document.documentElement);
    const readVar = (name: string, fallback: string) =>
      rootStyle.getPropertyValue(name).trim() || fallback;
    const emptyFill = readVar('--color-map-empty', '#d9dbe0');
    const background = readVar('--color-surface', '#ffffff');

    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll('.kr-map-selected').forEach((el) => el.classList.remove('kr-map-selected'));
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '100%');
    bg.setAttribute('height', '100%');
    bg.setAttribute('fill', background);
    clone.insertBefore(bg, clone.firstChild);

    const markup = new XMLSerializer()
      .serializeToString(clone)
      .split('var(--color-map-empty)').join(emptyFill)
      .split('var(--color-surface)').join(background);

    const name = `기상특보_${selectedKey}_${tmFc || 'map'}`;
    const svgUrl = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));

    const saveBlob = (blob: Blob, filename: string) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const viewBox = (clone.getAttribute('viewBox') ?? '0 0 509 716').split(/\s+/).map(Number);
    const scale = 3;
    const width = Math.round((viewBox[2] || 509) * scale);
    const height = Math.round((viewBox[3] || 716) * scale);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(svgUrl);
      canvas.toBlob((blob) => {
        if (blob) saveBlob(blob, `${name}.png`);
      }, 'image/png');
    };
    img.onerror = () => {
      // PNG 변환이 막히면 최소한 SVG라도 받게 한다
      URL.revokeObjectURL(svgUrl);
      saveBlob(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }), `${name}.svg`);
    };
    img.src = svgUrl;
  };

  const selectedType = warningTypeByKey(selectedKey) ?? WARNING_TYPES[0];

  return (
    <>
      <div className="app-header">
        <div>
          <div className="app-title">기상특보 지도</div>
          <div className="app-subtitle">기상청 기상특보 조회서비스 · 시/군/구 단위</div>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={handleDownload} disabled={loading}>
            지도 저장
          </button>
          <button className="icon-btn primary" onClick={fetchData} disabled={loading}>
            {loading ? '···' : '새로고침'}
          </button>
        </div>
      </div>

      <div className="search-box">
        <input
          className="search-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="지역 검색 (예: 성북구, 수원)"
          aria-label="지역 검색"
        />
        {searchResults.length > 0 && (
          <ul className="search-results">
            {searchResults.map((d) => (
              <li key={d.id}>
                <button
                  className="search-result"
                  onClick={() => {
                    setSelectedDistrict(d.id);
                    setQuery('');
                  }}
                >
                  <span className="search-result-province">{d.provinceLabel}</span>
                  {d.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        {query.trim() && searchResults.length === 0 && (
          <p className="search-empty">일치하는 지역이 없습니다.</p>
        )}
      </div>

      <div className="type-chips">
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
          <p className="meta-line">특보 데이터를 불러오는 중입니다…</p>
        </div>
      ) : (
        <>
          <div className="map-card">
            <div ref={mapWrapRef}>
              <ZoomableMap focusId={selectedDistrict}>
                <KoreaMap
                  districtFills={districtFills}
                  selectedId={selectedDistrict}
                  onDistrictClick={setSelectedDistrict}
                />
              </ZoomableMap>
            </div>

            <div className="legend">
              <span className="legend-item">
                <span className="legend-swatch" style={{ background: colorForLevel(selectedType.color, '주의보') }} />
                {selectedType.label} 주의보
              </span>
              <span className="legend-item">
                <span className="legend-swatch" style={{ background: selectedType.color }} />
                {selectedType.label} 경보
              </span>
              {activeEntriesForType.some((e) => e.level === '중대경보') && (
                <span className="legend-item">
                  <span className="legend-swatch" style={{ background: colorForLevel(selectedType.color, '중대경보') }} />
                  {selectedType.label} 중대경보
                </span>
              )}
              <span className="legend-item">
                <span className="legend-swatch" style={{ background: 'var(--color-map-empty)' }} />
                발표없음
              </span>
            </div>

            <p className="meta-line">
              {tmFc && `발표 ${formatKST(tmFc)} · `}
              {tmEf && `발효 ${formatKST(tmEf)} · `}
              {fetchedAt && `조회 ${fetchedAt} KST · `}
              지역 클릭 시 상세 특보 표시 · 스크롤/핀치로 확대
            </p>
          </div>

          {selectedDistrict && (
            <div className="detail-panel" ref={detailRef}>
              <div className="detail-panel-header">
                <span className="detail-panel-title">{selectedDistrictLabel}</span>
                <button className="detail-close-btn" onClick={() => setSelectedDistrict(null)}>✕</button>
              </div>
              {selectedDistrictEntries.length > 0 ? (
                <div className="badge-row">
                  {selectedDistrictEntries.map((e, i) => {
                    const type = warningTypeByKey(e.typeKey);
                    const bg = type ? colorForLevel(type.color, e.level) : '#888888';
                    return (
                      <span key={i} className="level-badge" style={{ background: bg, color: textColorFor(bg) }}>
                        {e.label}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>현재 발효 중인 특보가 없습니다.</p>
              )}
            </div>
          )}

          {/* 지역을 클릭하면 그 지역 정보에 집중하도록 전체 목록은 감춘다 */}
          {!selectedDistrict && listEntries.length > 0 && (
            <div className="warning-list">
              <div className="warning-list-title">{selectedType.label} 특보 상세</div>
              {listEntries.map((e, i) => {
                const bg = colorForLevel(selectedType.color, e.level);
                return (
                  <div key={i} className="warning-detail-row">
                    <span className="level-badge" style={{ background: bg, color: textColorFor(bg) }}>
                      {e.level}
                    </span>
                    <span>{e.areaText}</span>
                  </div>
                );
              })}
            </div>
          )}

          {!error && entries.length === 0 && (
            <p className="empty-note">현재 전국에 발효 중인 기상특보가 없습니다.</p>
          )}
        </>
      )}

      <div className="app-footer">
        출처: 기상청 기상자료개방포털 (기상특보 조회서비스)
      </div>
    </>
  );
}
