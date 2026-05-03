export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  precipitationType: number;
  precipitation: string;
  sky: number | null;        // 하늘상태 (1:맑음, 3:구름많음, 4:흐림) — 초단기예보
  lightning: number | null;  // 낙뢰 (0:없음, 1:있음) — 초단기예보
  baseDate: string;
  baseTime: string;
}

export interface AirQualityData {
  stationName: string;
  pm10Value: string | null;
  pm25Value: string | null;
  pm10Grade: string | null;
  pm25Grade: string | null;
  o3Value: string | null;
  o3Grade: string | null;
  no2Value: string | null;
  no2Grade: string | null;
  so2Value: string | null;
  so2Grade: string | null;
  coValue: string | null;
  coGrade: string | null;
  khaiValue: string | null;   // 통합대기환경지수
  khaiGrade: string | null;   // 통합대기환경등급
  dataTime: string;
}

export type GradeKey = 'good' | 'moderate' | 'bad' | 'very-bad';

export const GRADE_MAP: Record<string, GradeKey> = {
  '1': 'good',
  '2': 'moderate',
  '3': 'bad',
  '4': 'very-bad',
};

export const GRADE_LABEL: Record<GradeKey, string> = {
  'good': '좋음',
  'moderate': '보통',
  'bad': '나쁨',
  'very-bad': '매우나쁨',
};

export const PRECIP_LABEL: Record<number, string> = {
  0: 'CLEAR',
  1: 'RAIN',
  2: 'SLEET',
  3: 'SNOW',
  5: 'DRIZZLE',
  6: 'SNOW FLURRY',
  7: 'SNOW FLURRY',
};

export const SKY_LABEL: Record<number, string> = {
  1: 'CLEAR',
  3: 'PARTLY CLOUDY',
  4: 'OVERCAST',
};

export function weatherIcon(pty: number, sky: number | null): string {
  if (pty === 1) return '🌧️';
  if (pty === 2) return '🌨️';
  if (pty === 3) return '❄️';
  if (pty === 5) return '🌦️';
  if (pty === 6 || pty === 7) return '🌨️';
  if (sky === 1) return '☀️';
  if (sky === 3) return '⛅';
  if (sky === 4) return '☁️';
  return '🌤️';
}

export function weatherLabel(pty: number, sky: number | null): string {
  if (pty !== 0) return PRECIP_LABEL[pty] ?? '';
  if (sky !== null) return SKY_LABEL[sky] ?? '';
  return 'CLEAR';
}

export function windDirectionLabel(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

export const LOCATIONS: Array<{
  name: string; sub: string; region: string;
  nx: number; ny: number; station: string;
}> = [
  { name: '서울', sub: '중구',   region: '대한민국', nx: 60,  ny: 127, station: '덕수궁길' },
  { name: '부산', sub: '동구',   region: '대한민국', nx: 98,  ny: 76,  station: '광복동'   },
  { name: '대구', sub: '중구',   region: '대한민국', nx: 89,  ny: 90,  station: '수창동'   },
  { name: '인천', sub: '남동구', region: '대한민국', nx: 55,  ny: 124, station: '구월동'   },
  { name: '광주', sub: '동구',   region: '대한민국', nx: 58,  ny: 74,  station: '서석동'   },
  { name: '대전', sub: '동구',   region: '대한민국', nx: 67,  ny: 100, station: '용두동'   },
  { name: '울산', sub: '남구',   region: '대한민국', nx: 102, ny: 84,  station: '신정동'   },
  { name: '세종', sub: '나성동', region: '대한민국', nx: 66,  ny: 103, station: '나성동'   },
  { name: '경기', sub: '김포',   region: '대한민국', nx: 55,  ny: 128, station: '고촌읍'   },
  { name: '강원', sub: '원주',   region: '대한민국', nx: 76,  ny: 122, station: '중앙동'   },
  { name: '충북', sub: '청주',   region: '대한민국', nx: 69,  ny: 107, station: '영운동'   },
  { name: '충남', sub: '천안',   region: '대한민국', nx: 63,  ny: 110, station: '문화동'   },
  { name: '전북', sub: '전주',   region: '대한민국', nx: 63,  ny: 89,  station: '서원로'   },
  { name: '전남', sub: '여수',   region: '대한민국', nx: 73,  ny: 66,  station: '학동'     },
  { name: '경북', sub: '포항',   region: '대한민국', nx: 102, ny: 94,  station: '대도동'   },
  { name: '경남', sub: '창원',   region: '대한민국', nx: 90,  ny: 77,  station: '사파동'   },
  { name: '제주', sub: '제주시', region: '대한민국', nx: 53,  ny: 38,  station: '연동'     },
];
