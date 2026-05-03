export interface WeatherData {
  temperature: number;      // 기온 (°C)
  humidity: number;         // 습도 (%)
  windSpeed: number;        // 풍속 (m/s)
  windDirection: number;    // 풍향 (°)
  precipitationType: number; // 강수형태 (0:없음, 1:비, 2:비/눈, 3:눈, 5:빗방울, 6:빗방울눈날림, 7:눈날림)
  precipitation: string;    // 1시간 강수량 (mm)
  baseDate: string;
  baseTime: string;
  nx: number;
  ny: number;
}

export interface AirQualityData {
  stationName: string;      // 측정소명
  pm10Value: string;        // PM10 농도 (μg/m³)
  pm25Value: string;        // PM2.5 농도 (μg/m³)
  pm10Grade: string;        // PM10 등급 (1:좋음, 2:보통, 3:나쁨, 4:매우나쁨)
  pm25Grade: string;        // PM2.5 등급
  o3Value: string;          // 오존 농도 (ppm)
  coValue: string;          // 일산화탄소 (ppm)
  dataTime: string;         // 측정 시간
}

export interface LocationConfig {
  name: string;             // 표시 이름 (예: 서울)
  region: string;           // 지역 (예: 대한민국)
  nx: number;               // 기상청 격자 X
  ny: number;               // 기상청 격자 Y
  stationName: string;      // 에어코리아 측정소명
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

export const LOCATIONS: Array<{ name: string; region: string; nx: number; ny: number; station: string }> = [
  { name: '서울',   region: '대한민국', nx: 60,  ny: 127, station: '중구'    },
  { name: '부산',   region: '대한민국', nx: 98,  ny: 76,  station: '연제구'  },
  { name: '대구',   region: '대한민국', nx: 89,  ny: 90,  station: '수성구'  },
  { name: '인천',   region: '대한민국', nx: 55,  ny: 124, station: '미추홀구' },
  { name: '광주',   region: '대한민국', nx: 58,  ny: 74,  station: '북구'    },
  { name: '대전',   region: '대한민국', nx: 67,  ny: 100, station: '유성구'  },
  { name: '울산',   region: '대한민국', nx: 102, ny: 84,  station: '남구'    },
  { name: '세종',   region: '대한민국', nx: 66,  ny: 103, station: '세종'    },
  { name: '수원',   region: '대한민국', nx: 60,  ny: 121, station: '수원'    },
  { name: '청주',   region: '대한민국', nx: 69,  ny: 107, station: '서원구'  },
  { name: '전주',   region: '대한민국', nx: 63,  ny: 89,  station: '완산구'  },
  { name: '제주',   region: '대한민국', nx: 53,  ny: 38,  station: '이도동'  },
];

export const PRECIP_ICON: Record<number, string> = {
  0: '☀️',
  1: '🌧️',
  2: '🌨️',
  3: '❄️',
  5: '🌦️',
  6: '🌨️',
  7: '🌨️',
};

export function windDirectionLabel(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}
