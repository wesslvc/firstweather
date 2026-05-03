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

export const LOCATIONS: Array<{ name: string; region: string; nx: number; ny: number; station: string }> = [
  { name: '서울', region: '대한민국', nx: 60,  ny: 127, station: '중구'    },
  { name: '부산', region: '대한민국', nx: 98,  ny: 76,  station: '연제구'  },
  { name: '대구', region: '대한민국', nx: 89,  ny: 90,  station: '수성구'  },
  { name: '인천', region: '대한민국', nx: 55,  ny: 124, station: '미추홀구' },
  { name: '광주', region: '대한민국', nx: 58,  ny: 74,  station: '북구'    },
  { name: '대전', region: '대한민국', nx: 67,  ny: 100, station: '유성구'  },
  { name: '울산', region: '대한민국', nx: 102, ny: 84,  station: '남구'    },
  { name: '세종', region: '대한민국', nx: 66,  ny: 103, station: '세종'    },
  { name: '수원', region: '대한민국', nx: 60,  ny: 121, station: '수원'    },
  { name: '청주', region: '대한민국', nx: 69,  ny: 107, station: '서원구'  },
  { name: '전주', region: '대한민국', nx: 63,  ny: 89,  station: '완산구'  },
  { name: '제주', region: '대한민국', nx: 53,  ny: 38,  station: '이도동'  },
];
