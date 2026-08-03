'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="app-shell">
      <div className="app-title">기상특보 지도</div>
      <p style={{ fontSize: '0.9rem', color: '#e5484d', margin: '1rem 0' }}>
        화면을 그리는 중 오류가 발생했습니다.
      </p>
      <pre
        style={{
          fontSize: '0.75rem',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          padding: '0.8rem',
          color: 'var(--color-muted)',
        }}
      >
        {error.message}
        {error.digest ? `\n(digest: ${error.digest})` : ''}
      </pre>
      <button className="icon-btn primary" style={{ marginTop: '1rem' }} onClick={reset}>
        다시 시도
      </button>
    </main>
  );
}
