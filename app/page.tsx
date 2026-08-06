'use client';

import { useState } from 'react';
import WarningView from '@/components/WarningView';
import SdotView from '@/components/SdotView';

type Tab = 'warning' | 'sdot';

export default function Home() {
  const [tab, setTab] = useState<Tab>('warning');

  return (
    <main className="app-shell">
      <nav className="tab-bar" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'warning'}
          className={`tab${tab === 'warning' ? ' active' : ''}`}
          onClick={() => setTab('warning')}
        >
          기상특보
        </button>
        <button
          role="tab"
          aria-selected={tab === 'sdot'}
          className={`tab${tab === 'sdot' ? ' active' : ''}`}
          onClick={() => setTab('sdot')}
        >
          S-DoT 센서
        </button>
      </nav>

      {/* 탭을 오갈 때 각 화면의 상태(선택 지역/센서)가 초기화되지 않도록 마운트를 유지한다 */}
      <div hidden={tab !== 'warning'}>
        <WarningView />
      </div>
      <div hidden={tab !== 'sdot'}>
        <SdotView />
      </div>
    </main>
  );
}
