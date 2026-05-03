# 날씨 & 미세먼지

F1 레이스 스케줄 감성의 날씨 & 미세먼지 앱. 기상청 초단기실황 API와 한국환경공단 에어코리아 API를 사용합니다.

## 시작하기

### 1. API 키 설정

```bash
cp .env.local.example .env.local
```

`.env.local` 파일을 열고 API 키를 입력합니다:

```
KMA_API_KEY=기상청_인증키
AIRKOREA_API_KEY=에어코리아_인증키
```

> API 키 없이도 데모 데이터로 앱이 동작합니다.

### API 키 발급 방법

두 API 모두 [공공데이터포털 (data.go.kr)](https://www.data.go.kr) 에서 무료로 발급받을 수 있습니다.

- **기상청**: `기상청_단기예보 ((구)_동네예보) 조회서비스` 검색 후 활용 신청
- **에어코리아**: `한국환경공단_에어코리아_대기오염정보` 검색 → `측정소별 실시간 측정정보 조회` 신청

### 2. 개발 서버 실행

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인하세요.

## 기술 스택

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Custom CSS
- **Fonts**: Bebas Neue, Barlow Condensed, Noto Sans KR
- **API**: 기상청 초단기실황 / 에어코리아 대기오염정보
