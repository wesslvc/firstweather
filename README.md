# 기상특보 지도

기상청 기상특보 조회서비스를 이용해 특보 종류별로 전국 지도를 색칠해 보여주는 앱. F1 레이스 스케줄 감성의 타이포그래피를 사용합니다.

## 시작하기

### 1. API 키 설정

```bash
cp .env.local.example .env.local
```

`.env.local` 파일을 열고 API 키를 입력합니다:

```
KMA_API_KEY=기상청_인증키
```

### API 키 발급 방법

[공공데이터포털 (data.go.kr)](https://www.data.go.kr) 에서 무료로 발급받을 수 있습니다.

- 검색창에 `기상청_기상특보 조회서비스` 검색 → 활용신청
- 이미 기상청 API 키가 있다면 같은 키를 그대로 재사용합니다 (별도 서비스 추가 활용신청만 하면 됨)
- 승인까지 몇 분 ~ 2시간 정도 걸릴 수 있습니다

### 2. 개발 서버 실행

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인하세요.

## 기능

- 기상특보 종류(강풍·풍랑·호우·대설·건조·폭풍해일·지진해일·태풍·한파·폭염·황사) 중 선택
- 선택한 특보가 발효 중인 시/도를 지도에 색칠 (주의보: 연한색, 경보: 진한색)
- 특보 상세 문구(원문 지역 설명) 표시
- API 실패 시 데모/가짜 데이터 없이 오류 메시지만 표시

## 기술 스택

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Custom CSS
- **Fonts**: Bebas Neue, Barlow Condensed, Noto Sans KR
- **API**: 기상청 기상특보 조회서비스 (WthrWrnInfoService · getPwnStatus)
- **지도**: Wikimedia "Administrative divisions map of South Korea" SVG (시/군/구 경계)
